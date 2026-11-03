import { Course as CourseModel } from '../../../../generated/prisma/client';
import { CourseDTO } from '../models/course.dto';
import { CourseEntity, CourseWithStats } from '../models/course.entity';

export class CourseMapper {
  static modelToEntity(model: CourseModel): CourseEntity {
    return {
      id: model.id,
      teacherId: model.teacherId,
      code: model.code,
      name: model.name,
      term: model.term,
      period: model.period,
      institution: model.institution,
    };
  }

  static entityToDTO(entity: CourseWithStats): CourseDTO {
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      term: entity.term,
      period: entity.period,
      institution: entity.institution,
      enrolledCount: entity.stats.enrolledCount,
      lastSessionAt: entity.stats.lastSessionAt?.toISOString() ?? null,
      openSessionId: entity.stats.openSessionId,
    };
  }
}
