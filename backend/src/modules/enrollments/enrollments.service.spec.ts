import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from '../courses/courses.service';
import { CourseNotFoundException } from '../courses/exceptions/course-not-found.exception';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentConflictException } from './exceptions/enrollment-conflict.exception';
import { EnrollmentNotFoundException } from './exceptions/enrollment-not-found.exception';
import { EnrollmentEntity, EnrollmentStatus } from './models/enrollment.entity';
import { UpdateEnrollmentDTO } from './models/enrollment.dto';
import { EnrollmentRepository } from './repositories/enrollment.repository';

const teacherId = 'teacher1xxxxxxxxxxxxxxxx';
const courseId = 'course10xxxxxxxxxxxxxxxx';

const student = {
  id: 'student5xxxxxxxxxxxxxxxx',
  ra: '123456',
  name: 'Student',
  email: null,
  photoUrl: null,
  entryYear: null,
};

const enrollment: EnrollmentEntity = {
  courseId,
  studentId: student.id,
  status: EnrollmentStatus.ACTIVE,
  enrolledAt: new Date(),
  student,
};

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let repository: jest.Mocked<EnrollmentRepository>;
  let coursesService: jest.Mocked<CoursesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentsService,
        {
          provide: EnrollmentRepository,
          useValue: {
            findOrCreateStudent: jest.fn(() => Promise.resolve(student)),
            find: jest.fn(),
            create: jest.fn(() => Promise.resolve(enrollment)),
            findAll: jest.fn(),
            update: jest.fn((_c: string, _s: string, data: UpdateEnrollmentDTO) =>
              Promise.resolve({ ...enrollment, ...data }),
            ),
            remove: jest.fn(),
          },
        },
        { provide: CoursesService, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    service = module.get(EnrollmentsService);
    repository = module.get(EnrollmentRepository);
    coursesService = module.get(CoursesService);
  });

  describe('create', () => {
    it('reuses the existing student by ra', async () => {
      repository.find.mockResolvedValue(null);

      await service.create(teacherId, courseId, { ra: '123456', name: 'Another Name' });

      expect(repository.findOrCreateStudent).toHaveBeenCalledWith({
        ra: '123456',
        name: 'Another Name',
      });
      expect(repository.create).toHaveBeenCalledWith(courseId, student.id);
    });

    it('rejects enrolling the same student twice', async () => {
      repository.find.mockResolvedValue(enrollment);

      await expect(
        service.create(teacherId, courseId, { ra: '123456', name: 'Student' }),
      ).rejects.toThrow(EnrollmentConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not enroll into another teacher course', async () => {
      coursesService.findById.mockRejectedValue(new CourseNotFoundException(courseId));

      await expect(
        service.create('teacher99xxxxxxxxxxxxxxx', courseId, { ra: '123456', name: 'Student' }),
      ).rejects.toThrow(CourseNotFoundException);
      expect(repository.findOrCreateStudent).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('drops by status without deleting the enrollment', async () => {
      repository.find.mockResolvedValue(enrollment);

      const updated = await service.update(teacherId, courseId, student.id, {
        status: EnrollmentStatus.DROPPED,
      });

      expect(updated.status).toBe(EnrollmentStatus.DROPPED);
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('throws when the enrollment does not exist', async () => {
      repository.find.mockResolvedValue(null);

      await expect(
        service.update(teacherId, courseId, student.id, {
          status: EnrollmentStatus.DROPPED,
        }),
      ).rejects.toThrow(EnrollmentNotFoundException);
    });
  });

  describe('remove', () => {
    it('removes the enrollment when it exists', async () => {
      repository.find.mockResolvedValue(enrollment);
      await service.remove(teacherId, courseId, student.id);
      expect(repository.remove).toHaveBeenCalledWith(courseId, student.id);
    });

    it('throws when the enrollment does not exist', async () => {
      repository.find.mockResolvedValue(null);
      await expect(service.remove(teacherId, courseId, student.id)).rejects.toThrow(
        EnrollmentNotFoundException,
      );
    });
  });
});
