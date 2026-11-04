import {
  Attendance as AttendanceModel,
  Student as StudentModel,
} from '../../../../generated/prisma/client';
import { distanceInMeters } from '../../../shared/geo';
import { AttendanceDTO, RollEntryDTO } from '../models/attendance.dto';
import { AttendanceEntity, AttendanceFlags, AttendanceMethod } from '../models/attendance.entity';

type SessionReference = {
  latitude?: number | null;
  longitude?: number | null;
};

export class AttendanceMapper {
  static rollEntryToDTO(
    row: { student: StudentModel; attendance: AttendanceModel | null },
    session: SessionReference,
    options: { radiusM: number; sharedDeviceIds: Set<string> },
  ): RollEntryDTO {
    const student = {
      id: row.student.id,
      ra: row.student.ra,
      name: row.student.name,
      photoUrl: row.student.photoUrl,
      photoKey: row.student.photoKey,
    };

    if (!row.attendance) {
      return {
        student,
        status: 'ABSENT',
        method: null,
        recordedAt: null,
        distanceM: null,
        flags: null,
      };
    }

    const entity = AttendanceMapper.modelToEntity(row.attendance);
    const dto = AttendanceMapper.entityToDTO(entity, session, options);

    return {
      student,
      status: 'PRESENT',
      method: dto.method,
      recordedAt: dto.recordedAt,
      distanceM: dto.distanceM,
      flags: dto.flags,
    };
  }

  static modelToEntity(model: AttendanceModel & { student?: StudentModel }): AttendanceEntity {
    return {
      id: model.id,
      classSessionId: model.classSessionId,
      studentId: model.studentId,
      deviceId: model.deviceId,
      method: model.method,
      recordedAt: model.recordedAt,
      clientIp: model.clientIp,
      latitude: model.latitude === null ? null : Number(model.latitude),
      longitude: model.longitude === null ? null : Number(model.longitude),
      accuracyM: model.accuracyM,
      student: model.student
        ? {
            id: model.student.id,
            ra: model.student.ra,
            name: model.student.name,
            photoUrl: model.student.photoUrl,
            photoKey: model.student.photoKey,
          }
        : undefined,
    };
  }

  static distanceFrom(entity: AttendanceEntity, session: SessionReference): number | null {
    if (
      entity.latitude == null ||
      entity.longitude == null ||
      session.latitude == null ||
      session.longitude == null
    ) {
      return null;
    }
    return distanceInMeters(session.latitude, session.longitude, entity.latitude, entity.longitude);
  }

  static entityToDTO(
    entity: AttendanceEntity,
    session: SessionReference,
    options: { radiusM: number; sharedDeviceIds: Set<string> },
  ): AttendanceDTO {
    const distanceM = AttendanceMapper.distanceFrom(entity, session);

    const flags: AttendanceFlags = {
      noLocation:
        entity.method === AttendanceMethod.QR &&
        (entity.latitude == null || entity.longitude == null),
      farFromTeacher: distanceM !== null && distanceM > options.radiusM,
      sharedDevice:
        entity.deviceId !== null && entity.deviceId !== undefined
          ? options.sharedDeviceIds.has(entity.deviceId)
          : false,
    };

    return {
      student: {
        id: entity.student?.id ?? entity.studentId,
        ra: entity.student?.ra ?? '',
        name: entity.student?.name ?? '',
        photoUrl: entity.student?.photoUrl ?? null,
        photoKey: entity.student?.photoKey ?? null,
      },
      method: entity.method,
      recordedAt: entity.recordedAt.toISOString(),
      latitude: entity.latitude ?? null,
      longitude: entity.longitude ?? null,
      accuracyM: entity.accuracyM ?? null,
      distanceM,
      flags,
    };
  }
}
