import { Student as StudentModel } from '../../../../generated/prisma/client';
import { EnrollmentDTO } from '../models/enrollment.dto';
import { EnrollmentEntity, StudentEntity } from '../models/enrollment.entity';

export class EnrollmentMapper {
  static studentModelToEntity(model: StudentModel): StudentEntity {
    return {
      id: model.id,
      ra: model.ra,
      name: model.name,
      email: model.email,
      photoUrl: model.photoUrl,
      entryYear: model.entryYear,
    };
  }

  static entityToDTO(entity: EnrollmentEntity): EnrollmentDTO {
    return {
      student: {
        id: Number(entity.student?.id ?? entity.studentId),
        ra: entity.student?.ra ?? '',
        name: entity.student?.name ?? '',
        email: entity.student?.email ?? null,
        photoUrl: entity.student?.photoUrl ?? null,
        entryYear: entity.student?.entryYear ?? null,
      },
      status: entity.status,
      enrolledAt: entity.enrolledAt?.toISOString() ?? null,
    };
  }
}
