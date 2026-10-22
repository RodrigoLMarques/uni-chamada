import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaginatedItems } from '../../shared/pagination';
import { ClassSessionsService } from '../class-sessions/class-sessions.service';
import { statusOf } from '../class-sessions/models/class-session.entity';
import { AlreadyRegisteredException } from './exceptions/already-registered.exception';
import { AttendanceNotFoundException } from './exceptions/attendance-not-found.exception';
import { InvalidQrTokenException } from './exceptions/invalid-qr-token.exception';
import { NotEnrolledException } from './exceptions/not-enrolled.exception';
import { SessionNotOpenException } from './exceptions/session-not-open.exception';
import { AttendanceMapper } from './mappers/attendance.mapper';
import {
  AttendanceFilter,
  BulkManualAttendanceDTO,
  BulkManualAttendanceResultDTO,
  CreateManualAttendanceDTO,
  QrTokenDTO,
  RollEntryDTO,
  RollFilter,
  RollSummaryDTO,
  ScanDTO,
} from './models/attendance.dto';
import { AttendanceEntity, AttendanceMethod } from './models/attendance.entity';
import { QrTokenService } from './qr/qr-token.service';
import {
  AttendanceRepository,
  RollRow,
  newDeviceToken,
} from './repositories/attendance.repository';
import { StudentDeviceRepository } from './repositories/student-device.repository';

const DEFAULT_RADIUS_M = 100;

export type ScanResult = {
  attendance: AttendanceEntity;
  studentName: string;
  deviceToken?: string;
};

export type RollListing = {
  entries: PaginatedItems<RollRow>;
  summary: RollSummaryDTO;
  session: { latitude?: number | null; longitude?: number | null };
  radiusM: number;
  sharedDeviceIds: Set<string>;
};

export type AttendanceListing = {
  items: PaginatedItems<AttendanceEntity>;
  session: { latitude?: number | null; longitude?: number | null };
  radiusM: number;
  sharedDeviceIds: Set<string>;
};

@Injectable()
export class AttendanceService {
  private readonly radiusM: number;

  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly studentDeviceRepository: StudentDeviceRepository,
    private readonly qrTokenService: QrTokenService,
    private readonly classSessionsService: ClassSessionsService,
    configService: ConfigService,
  ) {
    this.radiusM = Number(configService.get('ATTENDANCE_RADIUS_M', DEFAULT_RADIUS_M));
  }

  async currentQrToken(
    teacherId: string,
    courseId: string,
    sessionId: string,
  ): Promise<QrTokenDTO> {
    const session = await this.classSessionsService.findById(teacherId, courseId, sessionId);
    if (statusOf(session) !== 'OPEN') throw new SessionNotOpenException();

    const { token, windowSeconds, expiresAt } = this.qrTokenService.sign(session.id);
    return { token, windowSeconds, expiresAt: expiresAt.toISOString() };
  }

  async scan(dto: ScanDTO, clientIp?: string | null): Promise<ScanResult> {
    const classSessionId = this.qrTokenService.verify(dto.token);
    if (!classSessionId) throw new InvalidQrTokenException();

    const session = await this.attendanceRepository.findSessionForScan(classSessionId);
    if (!session) throw new InvalidQrTokenException();
    if (session.openedAt === null || session.closedAt !== null) {
      throw new SessionNotOpenException();
    }

    const student = await this.attendanceRepository.findActiveStudentByRa(session.courseId, dto.ra);
    if (!student) throw new NotEnrolledException();

    if (await this.attendanceRepository.find(session.id, student.id)) {
      throw new AlreadyRegisteredException();
    }

    const known = dto.deviceToken
      ? await this.studentDeviceRepository.findByToken(dto.deviceToken)
      : null;

    let deviceId: string;
    let issuedDeviceToken: string | undefined;

    if (known) {
      deviceId = known.id;
    } else {
      const { token, tokenHash } = newDeviceToken();
      const created = await this.studentDeviceRepository.create(student.id, tokenHash);
      deviceId = created.id;
      issuedDeviceToken = token;
    }

    const attendance = await this.attendanceRepository.create({
      classSessionId: session.id,
      studentId: student.id,
      deviceId,
      method: AttendanceMethod.QR,
      clientIp,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracyM: dto.accuracyM,
    });

    return { attendance, studentName: student.name, deviceToken: issuedDeviceToken };
  }

  async createManual(
    teacherId: string,
    courseId: string,
    sessionId: string,
    dto: CreateManualAttendanceDTO,
  ): Promise<AttendanceEntity> {
    const session = await this.classSessionsService.findById(teacherId, courseId, sessionId);
    if (statusOf(session) === 'CONFIRMED') throw new SessionNotOpenException();

    const student = await this.attendanceRepository.findActiveStudentByRa(courseId, dto.ra);
    if (!student) throw new NotEnrolledException();

    if (await this.attendanceRepository.find(session.id, student.id)) {
      throw new AlreadyRegisteredException();
    }

    return this.attendanceRepository.create({
      classSessionId: session.id,
      studentId: student.id,
      method: AttendanceMethod.MANUAL,
    });
  }

  async findAll(
    teacherId: string,
    courseId: string,
    sessionId: string,
    filter: AttendanceFilter,
  ): Promise<AttendanceListing> {
    const session = await this.classSessionsService.findById(teacherId, courseId, sessionId);

    const [items, sharedDeviceIds] = await Promise.all([
      this.attendanceRepository.findAll(session.id, filter),
      this.attendanceRepository.findSharedDeviceIds(session.id),
    ]);

    return {
      items,
      session: { latitude: session.latitude, longitude: session.longitude },
      radiusM: this.radiusM,
      sharedDeviceIds,
    };
  }

  async roll(
    teacherId: string,
    courseId: string,
    sessionId: string,
    filter: RollFilter,
  ): Promise<RollListing> {
    const session = await this.classSessionsService.findById(teacherId, courseId, sessionId);

    const [entries, summary, sharedDeviceIds] = await Promise.all([
      this.attendanceRepository.findRoll(courseId, session.id, filter),
      this.attendanceRepository.countRoll(courseId, session.id),
      this.attendanceRepository.findSharedDeviceIds(session.id),
    ]);

    return {
      entries,
      summary,
      session: { latitude: session.latitude, longitude: session.longitude },
      radiusM: this.radiusM,
      sharedDeviceIds,
    };
  }

  async createManualBulk(
    teacherId: string,
    courseId: string,
    sessionId: string,
    dto: BulkManualAttendanceDTO,
  ): Promise<BulkManualAttendanceResultDTO> {
    const session = await this.classSessionsService.findById(teacherId, courseId, sessionId);
    if (statusOf(session) === 'CONFIRMED') throw new SessionNotOpenException();

    const requested = [...new Set(dto.ras)];
    const students = await this.attendanceRepository.findActiveStudentsByRas(courseId, requested);
    const byRa = new Map(students.map((student) => [student.ra, student]));

    const alreadyRegistered = await this.attendanceRepository.findRegisteredStudentIds(
      session.id,
      students.map((student) => student.id),
    );

    const skipped: BulkManualAttendanceResultDTO['skipped'] = [];
    const toCreate: { id: string; ra: string }[] = [];

    for (const ra of requested) {
      const student = byRa.get(ra);
      if (!student) {
        skipped.push({ ra, reason: 'NOT_ENROLLED' });
        continue;
      }
      if (alreadyRegistered.has(student.id)) {
        skipped.push({ ra, reason: 'ALREADY_REGISTERED' });
        continue;
      }
      toCreate.push({ id: student.id, ra });
    }

    if (toCreate.length > 0) {
      await this.attendanceRepository.createMany(
        toCreate.map((student) => ({
          classSessionId: session.id,
          studentId: student.id,
          method: AttendanceMethod.MANUAL,
        })),
      );
    }

    return { recorded: toCreate.map((student) => student.ra), skipped };
  }

  rollToDTO(listing: RollListing): {
    data: RollEntryDTO[];
    pagination: PaginatedItems<RollRow>['pagination'];
    summary: RollSummaryDTO;
  } {
    return {
      data: listing.entries.data.map((row) =>
        AttendanceMapper.rollEntryToDTO(row, listing.session, {
          radiusM: listing.radiusM,
          sharedDeviceIds: listing.sharedDeviceIds,
        }),
      ),
      pagination: listing.entries.pagination,
      summary: listing.summary,
    };
  }

  async remove(
    teacherId: string,
    courseId: string,
    sessionId: string,
    studentId: string,
  ): Promise<void> {
    const session = await this.classSessionsService.findById(teacherId, courseId, sessionId);
    if (statusOf(session) === 'CONFIRMED') throw new SessionNotOpenException();

    if (!(await this.attendanceRepository.find(session.id, studentId))) {
      throw new AttendanceNotFoundException(studentId);
    }

    await this.attendanceRepository.remove(session.id, studentId);
  }

  toDTO(listing: AttendanceListing) {
    return {
      data: listing.items.data.map((entity) =>
        AttendanceMapper.entityToDTO(entity, listing.session, {
          radiusM: listing.radiusM,
          sharedDeviceIds: listing.sharedDeviceIds,
        }),
      ),
      pagination: listing.items.pagination,
    };
  }
}
