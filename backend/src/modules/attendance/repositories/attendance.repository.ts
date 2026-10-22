import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AttendanceMethod } from '../../../../generated/prisma/enums';
import { PaginatedItems, makePagination } from '../../../shared/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceMapper } from '../mappers/attendance.mapper';
import { AttendanceFilter, RollFilter } from '../models/attendance.dto';
import { AttendanceEntity } from '../models/attendance.entity';
import { Prisma } from '../../../../generated/prisma/client';
import type {
  Attendance as AttendanceModel,
  Student as StudentModel,
} from '../../../../generated/prisma/client';

export type ScanSession = {
  id: string;
  courseId: string;
  openedAt: Date | null;
  closedAt: Date | null;
  confirmedAt: Date | null;
};

export type RollRow = {
  student: StudentModel;
  attendance: AttendanceModel | null;
};

export type RollSummary = {
  enrolled: number;
  present: number;
  absent: number;
};

export type CreateAttendanceInput = {
  classSessionId: string;
  studentId: string;
  deviceId?: string | null;
  method: AttendanceMethod;
  clientIp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyM?: number | null;
};

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSessionForScan(id: string): Promise<ScanSession | null> {
    return this.prisma.classSession.findUnique({
      where: { id },
      select: { id: true, courseId: true, openedAt: true, closedAt: true, confirmedAt: true },
    });
  }

  async findActiveStudentByRa(
    courseId: string,
    ra: string,
  ): Promise<{ id: string; name: string } | null> {
    const student = await this.prisma.student.findFirst({
      where: {
        ra,
        enrollments: { some: { courseId, status: 'ACTIVE' } },
      },
      select: { id: true, name: true },
    });
    return student;
  }

  async findStudentByRa(ra: string): Promise<{ id: string; name: string } | null> {
    return this.prisma.student.findUnique({ where: { ra }, select: { id: true, name: true } });
  }

  async find(classSessionId: string, studentId: string): Promise<AttendanceEntity | null> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { classSessionId_studentId: { classSessionId, studentId } },
      include: { student: true },
    });
    if (!attendance) return null;
    return AttendanceMapper.modelToEntity(attendance);
  }

  async create(input: CreateAttendanceInput): Promise<AttendanceEntity> {
    const created = await this.prisma.attendance.create({
      data: {
        classSessionId: input.classSessionId,
        studentId: input.studentId,
        deviceId: input.deviceId ?? null,
        method: input.method,
        clientIp: input.clientIp ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        accuracyM: input.accuracyM ?? null,
      },
      include: { student: true },
    });
    return AttendanceMapper.modelToEntity(created);
  }

  async findAll(
    classSessionId: string,
    filter: AttendanceFilter,
  ): Promise<PaginatedItems<AttendanceEntity>> {
    const [items, totalItems] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { classSessionId },
        include: { student: true },
        orderBy: { recordedAt: 'asc' },
        take: filter.itemsPerPage,
        skip: (filter.page - 1) * filter.itemsPerPage,
      }),
      this.prisma.attendance.count({ where: { classSessionId } }),
    ]);

    return {
      data: items.map((item) => AttendanceMapper.modelToEntity(item)),
      pagination: makePagination(filter.page, filter.itemsPerPage, totalItems),
    };
  }

  async findSharedDeviceIds(classSessionId: string): Promise<Set<string>> {
    const grouped = await this.prisma.attendance.groupBy({
      by: ['deviceId'],
      where: { classSessionId, deviceId: { not: null } },
      having: { deviceId: { _count: { gt: 1 } } },
    });
    return new Set(grouped.map((row) => row.deviceId).filter((id): id is string => id !== null));
  }

  async findRoll(
    courseId: string,
    classSessionId: string,
    filter: RollFilter,
  ): Promise<PaginatedItems<RollRow>> {
    const where: Prisma.EnrollmentWhereInput = { courseId, status: 'ACTIVE' };
    const student: Prisma.StudentWhereInput = {};

    if (filter.query) {
      student.OR = [
        { name: { contains: filter.query, mode: 'insensitive' } },
        { ra: { contains: filter.query, mode: 'insensitive' } },
      ];
    }
    if (filter.status === 'PRESENT') {
      student.attendances = { some: { classSessionId } };
    }
    if (filter.status === 'ABSENT') {
      student.attendances = { none: { classSessionId } };
    }
    if (Object.keys(student).length > 0) {
      where.student = student;
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        include: {
          student: { include: { attendances: { where: { classSessionId } } } },
        },
        orderBy: { student: { name: 'asc' } },
        take: filter.itemsPerPage,
        skip: (filter.page - 1) * filter.itemsPerPage,
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        student: item.student,
        attendance: item.student.attendances[0] ?? null,
      })),
      pagination: makePagination(filter.page, filter.itemsPerPage, totalItems),
    };
  }

  async countRoll(courseId: string, classSessionId: string): Promise<RollSummary> {
    const [enrolled, present] = await Promise.all([
      this.prisma.enrollment.count({ where: { courseId, status: 'ACTIVE' } }),
      this.prisma.enrollment.count({
        where: {
          courseId,
          status: 'ACTIVE',
          student: { attendances: { some: { classSessionId } } },
        },
      }),
    ]);

    return { enrolled, present, absent: enrolled - present };
  }

  async findActiveStudentsByRas(
    courseId: string,
    ras: string[],
  ): Promise<{ id: string; ra: string; name: string }[]> {
    return this.prisma.student.findMany({
      where: {
        ra: { in: ras },
        enrollments: { some: { courseId, status: 'ACTIVE' } },
      },
      select: { id: true, ra: true, name: true },
    });
  }

  async findRegisteredStudentIds(
    classSessionId: string,
    studentIds: string[],
  ): Promise<Set<string>> {
    const rows = await this.prisma.attendance.findMany({
      where: { classSessionId, studentId: { in: studentIds } },
      select: { studentId: true },
    });
    return new Set(rows.map((row) => row.studentId));
  }

  async createMany(inputs: CreateAttendanceInput[]): Promise<number> {
    const { count } = await this.prisma.attendance.createMany({
      data: inputs.map((input) => ({
        classSessionId: input.classSessionId,
        studentId: input.studentId,
        deviceId: input.deviceId ?? null,
        method: input.method,
        clientIp: input.clientIp ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        accuracyM: input.accuracyM ?? null,
      })),
    });
    return count;
  }

  async remove(classSessionId: string, studentId: string): Promise<void> {
    await this.prisma.attendance.delete({
      where: { classSessionId_studentId: { classSessionId, studentId } },
    });
  }
}

export function newDeviceToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashDeviceToken(token) };
}

export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
