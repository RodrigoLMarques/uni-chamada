import { Course as CourseModel } from '../../../../generated/prisma/client';
import { CourseDTO } from '../models/course.dto';
import { CourseEntity } from '../models/course.entity';

export class CourseMapper {
  static modelToEntity(model: CourseModel): CourseEntity {
    return {
      id: model.id,
      teacherId: model.teacherId,
      code: model.code,
      name: model.name,
      term: model.term,
      period: model.period,
    };
  }

  static entityToDTO(entity: CourseEntity): CourseDTO {
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      term: entity.term,
      period: entity.period,
    };
  }
}
