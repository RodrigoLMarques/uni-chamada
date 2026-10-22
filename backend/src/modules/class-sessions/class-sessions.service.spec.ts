import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from '../courses/courses.service';
import { CourseNotFoundException } from '../courses/exceptions/course-not-found.exception';
import { ClassSessionsService } from './class-sessions.service';
import { ClassSessionConflictException } from './exceptions/class-session-conflict.exception';
import { ClassSessionNotFoundException } from './exceptions/class-session-not-found.exception';
import { ClassSessionStateException } from './exceptions/class-session-state.exception';
import { ClassSessionEntity } from './models/class-session.entity';

import { ClassSessionRepository } from './repositories/class-session.repository';

const teacherId = 'teacher1xxxxxxxxxxxxxxxx';
const courseId = 'course10xxxxxxxxxxxxxxxx';
const sessionId = 'session100xxxxxxxxxxxxxx';

const scheduled: ClassSessionEntity = {
  id: sessionId,
  courseId,
  startsAt: new Date('2026-11-03T13:00:00.000Z'),
  openedAt: null,
  closedAt: null,
  confirmedAt: null,
  latitude: null,
  longitude: null,
  accuracyM: null,
};

const open: ClassSessionEntity = { ...scheduled, openedAt: new Date() };
const closed: ClassSessionEntity = { ...open, closedAt: new Date() };
const confirmed: ClassSessionEntity = { ...closed, confirmedAt: new Date() };

describe('ClassSessionsService', () => {
  let service: ClassSessionsService;
  let repository: jest.Mocked<ClassSessionRepository>;
  let coursesService: jest.Mocked<CoursesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassSessionsService,
        {
          provide: ClassSessionRepository,
          useValue: {
            create: jest.fn((c: string, startsAt: Date) =>
              Promise.resolve({ ...scheduled, courseId: c, startsAt }),
            ),
            findById: jest.fn(),
            findByStartsAt: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn((_id: string, data: Record<string, unknown>) =>
              Promise.resolve({ ...scheduled, ...data }),
            ),
            remove: jest.fn(),
          },
        },
        { provide: CoursesService, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    service = module.get(ClassSessionsService);
    repository = module.get(ClassSessionRepository);
    coursesService = module.get(CoursesService);
  });

  describe('create', () => {
    it('schedules the session for a course the teacher owns', async () => {
      repository.findByStartsAt.mockResolvedValue(null);

      const session = await service.create(teacherId, courseId, {
        startsAt: '2026-11-03T13:00:00.000Z',
      });

      expect(session.courseId).toBe(courseId);
      expect(session.openedAt).toBeNull();
    });

    it('rejects two sessions at the same time with 409', async () => {
      repository.findByStartsAt.mockResolvedValue(scheduled);

      await expect(
        service.create(teacherId, courseId, { startsAt: '2026-11-03T13:00:00.000Z' }),
      ).rejects.toThrow(ClassSessionConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not create for a course owned by another teacher', async () => {
      coursesService.findById.mockRejectedValue(new CourseNotFoundException(courseId));

      await expect(
        service.create('teacher99xxxxxxxxxxxxxxx', courseId, {
          startsAt: '2026-11-03T13:00:00.000Z',
        }),
      ).rejects.toThrow(CourseNotFoundException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('throws when the session is not in that course', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById(teacherId, courseId, sessionId)).rejects.toThrow(
        ClassSessionNotFoundException,
      );
    });
  });

  describe('open', () => {
    it('stores the teacher location as the distance reference', async () => {
      repository.findById.mockResolvedValue(scheduled);

      const session = await service.open(teacherId, courseId, sessionId, {
        latitude: -23.5505,
        longitude: -46.6333,
        accuracyM: 12.5,
      });

      expect(session.openedAt).toBeInstanceOf(Date);
      expect(session.latitude).toBe(-23.5505);
      expect(session.longitude).toBe(-46.6333);
      expect(session.accuracyM).toBe(12.5);
    });

    it('opens without location when the browser denies it', async () => {
      repository.findById.mockResolvedValue(scheduled);

      const session = await service.open(teacherId, courseId, sessionId, {});

      expect(session.openedAt).toBeInstanceOf(Date);
      expect(session.latitude).toBeUndefined();
    });

    it('rejects latitude without longitude', async () => {
      repository.findById.mockResolvedValue(scheduled);

      await expect(
        service.open(teacherId, courseId, sessionId, { latitude: -23.5 }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('refuses to open an already open session', async () => {
      repository.findById.mockResolvedValue(open);

      await expect(service.open(teacherId, courseId, sessionId, {})).rejects.toThrow(
        ClassSessionStateException,
      );
    });

    it('refuses to reopen a closed session', async () => {
      repository.findById.mockResolvedValue(closed);

      await expect(service.open(teacherId, courseId, sessionId, {})).rejects.toThrow(
        ClassSessionStateException,
      );
    });
  });

  describe('close', () => {
    it('closes an open session', async () => {
      repository.findById.mockResolvedValue(open);

      const session = await service.close(teacherId, courseId, sessionId);

      expect(session.closedAt).toBeInstanceOf(Date);
    });

    it('refuses to close a session that never opened', async () => {
      repository.findById.mockResolvedValue(scheduled);

      await expect(service.close(teacherId, courseId, sessionId)).rejects.toThrow(
        ClassSessionStateException,
      );
    });
  });

  describe('confirm', () => {
    it('confirms a closed session', async () => {
      repository.findById.mockResolvedValue(closed);

      const session = await service.confirm(teacherId, courseId, sessionId);

      expect(session.confirmedAt).toBeInstanceOf(Date);
    });

    it('refuses to confirm a session still open', async () => {
      repository.findById.mockResolvedValue(open);

      await expect(service.confirm(teacherId, courseId, sessionId)).rejects.toThrow(
        ClassSessionStateException,
      );
    });

    it('refuses to confirm twice', async () => {
      repository.findById.mockResolvedValue(confirmed);

      await expect(service.confirm(teacherId, courseId, sessionId)).rejects.toThrow(
        ClassSessionStateException,
      );
    });
  });

  describe('update', () => {
    it('reschedules a session that has not opened', async () => {
      repository.findById.mockResolvedValue(scheduled);
      repository.findByStartsAt.mockResolvedValue(null);

      const session = await service.update(teacherId, courseId, sessionId, {
        startsAt: '2026-11-10T13:00:00.000Z',
      });

      expect(session.startsAt.toISOString()).toBe('2026-11-10T13:00:00.000Z');
    });

    it('refuses to reschedule an open session', async () => {
      repository.findById.mockResolvedValue(open);

      await expect(
        service.update(teacherId, courseId, sessionId, { startsAt: '2026-11-10T13:00:00.000Z' }),
      ).rejects.toThrow(ClassSessionStateException);
    });
  });

  describe('remove', () => {
    it('deletes a scheduled session', async () => {
      repository.findById.mockResolvedValue(scheduled);
      await service.remove(teacherId, courseId, sessionId);
      expect(repository.remove).toHaveBeenCalledWith(sessionId);
    });

    it('refuses to delete a session that already ran', async () => {
      repository.findById.mockResolvedValue(closed);

      await expect(service.remove(teacherId, courseId, sessionId)).rejects.toThrow(
        ClassSessionStateException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});
