import { ClassSession as ClassSessionModel } from '../../../../generated/prisma/client';
import { ClassSessionDTO } from '../models/class-session.dto';
import { ClassSessionEntity, statusOf } from '../models/class-session.entity';

export class ClassSessionMapper {
  static modelToEntity(model: ClassSessionModel): ClassSessionEntity {
    return {
      id: model.id,
      courseId: model.courseId,
      startsAt: model.startsAt,
      openedAt: model.openedAt,
      closedAt: model.closedAt,
      confirmedAt: model.confirmedAt,
      latitude: model.latitude === null ? null : Number(model.latitude),
      longitude: model.longitude === null ? null : Number(model.longitude),
      accuracyM: model.accuracyM,
    };
  }

  static entityToDTO(entity: ClassSessionEntity): ClassSessionDTO {
    return {
      id: entity.id,
      courseId: entity.courseId,
      startsAt: entity.startsAt.toISOString(),
      openedAt: entity.openedAt?.toISOString() ?? null,
      closedAt: entity.closedAt?.toISOString() ?? null,
      confirmedAt: entity.confirmedAt?.toISOString() ?? null,
      latitude: entity.latitude ?? null,
      longitude: entity.longitude ?? null,
      accuracyM: entity.accuracyM ?? null,
      status: statusOf(entity),
    };
  }
}
