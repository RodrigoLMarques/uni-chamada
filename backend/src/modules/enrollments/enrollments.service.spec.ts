import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from '../courses/courses.service';
import { CourseNotFoundException } from '../courses/exceptions/course-not-found.exception';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentConflictException } from './exceptions/enrollment-conflict.exception';
import { UnifespUnavailableException } from '../unifesp/exceptions/unifesp-unavailable.exception';
import { EnrollmentNotFoundException } from './exceptions/enrollment-not-found.exception';
import { EnrollmentEntity, EnrollmentStatus } from './models/enrollment.entity';
import { UpdateEnrollmentDTO } from './models/enrollment.dto';
import { EnrollmentRepository } from './repositories/enrollment.repository';
import { StorageService } from '../storage/storage.service';
import { UnifespClientService } from '../unifesp/unifesp-client.service';
import { UnifespProfile } from '../unifesp/models/unifesp.model';

const teacherId = 'teacher1xxxxxxxxxxxxxxxx';
const courseId = 'course10xxxxxxxxxxxxxxxx';

const unifespProfile: UnifespProfile = {
  name: 'Unifesp Student',
  email: 'unifesp.student@unifesp.br',
  photoPath: 'https://busca.siiu.unifesp.br/cracha/foto/abc',
  course: 'CIENCIA E TECNOLOGIA',
  entryYear: 2024,
};

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
            upsertUnifespStudent: jest.fn(),
            create: jest.fn(() => Promise.resolve(enrollment)),
            findAll: jest.fn(),
            update: jest.fn((_c: string, _s: string, data: UpdateEnrollmentDTO) =>
              Promise.resolve({ ...enrollment, ...data }),
            ),
            remove: jest.fn(),
          },
        },
        { provide: CoursesService, useValue: { findById: jest.fn() } },
        {
          provide: UnifespClientService,
          useValue: {
            configured: true,
            profile: jest.fn(() => Promise.resolve(unifespProfile)),
            downloadPhoto: jest.fn(() =>
              Promise.resolve({ bytes: Buffer.from('img'), contentType: 'image/jpeg' }),
            ),
          },
        },
        {
          provide: StorageService,
          useValue: {
            configured: true,
            upload: jest.fn((key: string) => Promise.resolve(key)),
            presignMany: jest.fn(() => Promise.resolve(new Map<string, string>())),
          },
        },
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

  describe('createFromUnifesp', () => {
    const handle = 'docto|cpfhash|null|null|180385';

    it('uses the ra from the end of the handle', async () => {
      repository.find.mockResolvedValue(null);
      const upsert = repository.upsertUnifespStudent as jest.Mock;
      upsert.mockResolvedValue(student);

      await service.createFromUnifesp(teacherId, courseId, { handle });

      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({ ra: '180385', name: 'Unifesp Student' }),
      );
    });

    it('stores the photo and keeps the returned key', async () => {
      repository.find.mockResolvedValue(null);
      const upsert = repository.upsertUnifespStudent as jest.Mock;
      upsert.mockResolvedValue(student);

      await service.createFromUnifesp(teacherId, courseId, { handle });

      const [input] = upsert.mock.calls[0] as [{ photoKey: string | null }];
      expect(input.photoKey).toMatch(/^students\/180385-/);
    });

    it('lets the teacher override name and email', async () => {
      repository.find.mockResolvedValue(null);
      const upsert = repository.upsertUnifespStudent as jest.Mock;
      upsert.mockResolvedValue(student);

      await service.createFromUnifesp(teacherId, courseId, {
        handle,
        name: 'Nome Editado',
        email: 'editado@unifesp.br',
      });

      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Nome Editado', email: 'editado@unifesp.br' }),
      );
    });

    it('rejects a handle without ra', async () => {
      await expect(
        service.createFromUnifesp(teacherId, courseId, { handle: 'docto|hash|null|null|null' }),
      ).rejects.toThrow(UnifespUnavailableException);
    });

    it('returns the existing enrollment instead of duplicating', async () => {
      const upsert = repository.upsertUnifespStudent as jest.Mock;
      upsert.mockResolvedValue(student);
      repository.find.mockResolvedValue(enrollment);

      const result = await service.createFromUnifesp(teacherId, courseId, { handle });

      expect(result).toBe(enrollment);
      expect(repository.create).not.toHaveBeenCalled();
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
