import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AttendanceMethod, CoursePeriod } from '../../../../generated/prisma/enums';
import { PaginatedItems, makePagination } from '../../../shared/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceMapper } from '../mappers/attendance.mapper';
import { AttendanceFilter, CourseReportFilter, RollFilter } from '../models/attendance.dto';
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

export type PaginationQueryLike = { page: number; itemsPerPage: number };

export type StudentCourseRow = {
  course: { id: string; code: string; name: string; term: string; period: CoursePeriod };
  confirmedSessions: number;
  attendedSessions: number;
  pendingSessions: number;
};

export type StudentCourses = {
  student: { id: string; ra: string; name: string };
  courses: StudentCourseRow[];
};

export type StudentSessionRow = {
  id: string;
  startsAt: Date;
  attendance: AttendanceModel | null;
};

export type CourseSessionCounts = {
  confirmedSessions: number;
  pendingSessions: number;
};

export type CourseReportRow = {
  student: StudentModel;
  attendedSessions: number;
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

  async findSessionContext(id: string) {
    return this.prisma.classSession.findUnique({
      where: { id },
      select: {
        id: true,
        startsAt: true,
        openedAt: true,
        closedAt: true,
        confirmedAt: true,
        course: {
          select: {
            name: true,
            code: true,
            term: true,
            period: true,
            teacher: { select: { name: true } },
          },
        },
      },
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

  async findRecent(classSessionId: string, limit: number): Promise<AttendanceEntity[]> {
    const rows = await this.prisma.attendance.findMany({
      where: { classSessionId },
      include: { student: true },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => AttendanceMapper.modelToEntity(row));
  }

  async findLastRecordedAt(classSessionId: string): Promise<Date | null> {
    const row = await this.prisma.attendance.findFirst({
      where: { classSessionId },
      orderBy: { recordedAt: 'desc' },
      select: { recordedAt: true },
    });
    return row?.recordedAt ?? null;
  }

  async findStudentCourses(ra: string): Promise<StudentCourses | null> {
    const student = await this.prisma.student.findUnique({
      where: { ra },
      select: { id: true, ra: true, name: true },
    });
    if (!student) return null;

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: student.id, status: 'ACTIVE' },
      include: {
        course: { select: { id: true, code: true, name: true, term: true, period: true } },
      },
      orderBy: { course: { term: 'desc' } },
    });

    const courseIds = enrollments.map((enrollment) => enrollment.courseId);
    if (courseIds.length === 0) {
      return { student, courses: [] };
    }

    const [confirmed, pending, attended] = await Promise.all([
      this.prisma.classSession.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds }, confirmedAt: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.classSession.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds }, closedAt: { not: null }, confirmedAt: null },
        _count: { _all: true },
      }),
      this.prisma.attendance.findMany({
        where: {
          studentId: student.id,
          classSession: { courseId: { in: courseIds }, confirmedAt: { not: null } },
        },
        select: { classSession: { select: { courseId: true } } },
      }),
    ]);

    const confirmedBy = new Map(confirmed.map((row) => [row.courseId, row._count._all]));
    const pendingBy = new Map(pending.map((row) => [row.courseId, row._count._all]));
    const attendedBy = new Map<string, number>();
    for (const row of attended) {
      const courseId = row.classSession.courseId;
      attendedBy.set(courseId, (attendedBy.get(courseId) ?? 0) + 1);
    }

    return {
      student,
      courses: enrollments.map((enrollment) => ({
        course: enrollment.course,
        confirmedSessions: confirmedBy.get(enrollment.courseId) ?? 0,
        attendedSessions: attendedBy.get(enrollment.courseId) ?? 0,
        pendingSessions: pendingBy.get(enrollment.courseId) ?? 0,
      })),
    };
  }

  async isEnrolled(ra: string, courseId: string): Promise<{ id: string } | null> {
    return this.prisma.student.findFirst({
      where: { ra, enrollments: { some: { courseId, status: 'ACTIVE' } } },
      select: { id: true },
    });
  }

  async findStudentSessions(
    studentId: string,
    courseId: string,
    filter: PaginationQueryLike,
  ): Promise<PaginatedItems<StudentSessionRow>> {
    const where = { courseId, confirmedAt: { not: null } };

    const [items, totalItems] = await Promise.all([
      this.prisma.classSession.findMany({
        where,
        include: { attendances: { where: { studentId } } },
        orderBy: { startsAt: 'desc' },
        take: filter.itemsPerPage,
        skip: (filter.page - 1) * filter.itemsPerPage,
      }),
      this.prisma.classSession.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        id: item.id,
        startsAt: item.startsAt,
        attendance: item.attendances[0] ?? null,
      })),
      pagination: makePagination(filter.page, filter.itemsPerPage, totalItems),
    };
  }

  async countCourseSessions(courseId: string): Promise<CourseSessionCounts> {
    const [confirmed, pending] = await Promise.all([
      this.prisma.classSession.count({ where: { courseId, confirmedAt: { not: null } } }),
      this.prisma.classSession.count({
        where: { courseId, closedAt: { not: null }, confirmedAt: null },
      }),
    ]);
    return { confirmedSessions: confirmed, pendingSessions: pending };
  }

  async findCourseReport(
    courseId: string,
    filter: CourseReportFilter,
  ): Promise<PaginatedItems<CourseReportRow>> {
    const where: Prisma.EnrollmentWhereInput = { courseId, status: 'ACTIVE' };

    if (filter.query) {
      where.student = {
        OR: [
          { name: { contains: filter.query, mode: 'insensitive' } },
          { ra: { contains: filter.query, mode: 'insensitive' } },
        ],
      };
    }

    const [enrollments, totalItems] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        include: { student: true },
        orderBy: { student: { name: 'asc' } },
        take: filter.itemsPerPage,
        skip: (filter.page - 1) * filter.itemsPerPage,
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    const studentIds = enrollments.map((enrollment) => enrollment.studentId);

    const attended =
      studentIds.length === 0
        ? []
        : await this.prisma.attendance.groupBy({
            by: ['studentId'],
            where: {
              studentId: { in: studentIds },
              classSession: { courseId, confirmedAt: { not: null } },
            },
            _count: { _all: true },
          });

    const attendedBy = new Map(attended.map((row) => [row.studentId, row._count._all]));

    return {
      data: enrollments.map((enrollment) => ({
        student: enrollment.student,
        attendedSessions: attendedBy.get(enrollment.studentId) ?? 0,
      })),
      pagination: makePagination(filter.page, filter.itemsPerPage, totalItems),
    };
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
