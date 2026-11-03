import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { CourseConflictException } from './exceptions/course-conflict.exception';
import { CourseNotFoundException } from './exceptions/course-not-found.exception';
import { CourseEntity, CoursePeriod, CourseWithStats, Institution } from './models/course.entity';
import { CourseRepository } from './repositories/course.repository';

const teacherId = 'teacher1xxxxxxxxxxxxxxxx';

const existing: CourseEntity = {
  id: 'course10xxxxxxxxxxxxxxxx',
  teacherId,
  code: 'BCM0504',
  name: 'Data Structures and Algorithms',
  term: '2026.2',
  period: CoursePeriod.FULL_TIME,
  institution: Institution.OTHER,
};

const existingWithStats: CourseWithStats = {
  ...existing,
  stats: {
    enrolledCount: 12,
    lastSessionAt: new Date('2026-10-17T22:00:00.000Z'),
    openSessionId: null,
  },
};

describe('CoursesService', () => {
  let service: CoursesService;
  let repository: jest.Mocked<CourseRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: CourseRepository,
          useValue: {
            create: jest.fn((course: Omit<CourseEntity, 'id'>) =>
              Promise.resolve({ ...course, id: 'course11xxxxxxxxxxxxxxxx' }),
            ),
            findByIdAndTeacher: jest.fn(),
            findSummaryByIdAndTeacher: jest.fn(),
            findDuplicate: jest.fn(),
            findAllByTeacher: jest.fn(),
            update: jest.fn((id: string, data: Partial<CourseEntity>) =>
              Promise.resolve({ ...existing, ...data }),
            ),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CoursesService);
    repository = module.get(CourseRepository);
  });

  describe('create', () => {
    it('creates the course for the signed in teacher', async () => {
      repository.findDuplicate.mockResolvedValue(null);

      const course = await service.create(teacherId, {
        code: 'BCM0504',
        name: 'DSA',
        term: '2026.2',
        period: CoursePeriod.EVENING,
      });

      expect(course.teacherId).toBe(teacherId);
      expect(course.period).toBe(CoursePeriod.EVENING);
    });

    it('rejects a duplicate of code, term and period', async () => {
      repository.findDuplicate.mockResolvedValue(existing);

      await expect(
        service.create(teacherId, {
          code: existing.code,
          name: 'DSA',
          term: existing.term,
          period: existing.period,
        }),
      ).rejects.toThrow(CourseConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('accepts the same code and term in a different period', async () => {
      repository.findDuplicate.mockResolvedValue(null);

      const course = await service.create(teacherId, {
        code: existing.code,
        name: existing.name,
        term: existing.term,
        period: CoursePeriod.EVENING,
      });

      expect(course.period).toBe(CoursePeriod.EVENING);
      expect(repository.findDuplicate).toHaveBeenCalledWith(
        teacherId,
        existing.code,
        existing.term,
        CoursePeriod.EVENING,
      );
    });
  });

  describe('findById', () => {
    it('throws 404 for a course owned by another teacher', async () => {
      repository.findSummaryByIdAndTeacher.mockResolvedValue(null);

      await expect(service.findById('teacher99xxxxxxxxxxxxxxx', existing.id)).rejects.toThrow(
        CourseNotFoundException,
      );
    });

    it('carries the enrolment count and the open session', async () => {
      repository.findSummaryByIdAndTeacher.mockResolvedValue(existingWithStats);

      const course = await service.findById(teacherId, existing.id);

      expect(course.stats.enrolledCount).toBe(12);
      expect(course.stats.openSessionId).toBeNull();
    });
  });

  describe('update', () => {
    it('does not check duplicates when the key is unchanged', async () => {
      repository.findByIdAndTeacher.mockResolvedValue(existing);
      repository.findSummaryByIdAndTeacher.mockResolvedValue(existingWithStats);

      await service.update(teacherId, existing.id, { name: 'Another Name' });

      expect(repository.findDuplicate).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalled();
    });

    it('rejects when the new key collides with another course', async () => {
      repository.findByIdAndTeacher.mockResolvedValue(existing);
      repository.findDuplicate.mockResolvedValue({ ...existing, id: 'course77xxxxxxxxxxxxxxxx' });

      await expect(
        service.update(teacherId, existing.id, { period: CoursePeriod.EVENING }),
      ).rejects.toThrow(CourseConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('allows when the duplicate found is the course itself', async () => {
      repository.findByIdAndTeacher.mockResolvedValue(existing);
      repository.findSummaryByIdAndTeacher.mockResolvedValue(existingWithStats);
      repository.findDuplicate.mockResolvedValue(existing);

      await expect(
        service.update(teacherId, existing.id, { period: CoursePeriod.EVENING }),
      ).resolves.toBeDefined();
    });
  });

  describe('remove', () => {
    it('throws 404 before removing a course owned by another teacher', async () => {
      repository.findByIdAndTeacher.mockResolvedValue(null);

      await expect(service.remove('teacher99xxxxxxxxxxxxxxx', existing.id)).rejects.toThrow(
        CourseNotFoundException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });
  });
});
