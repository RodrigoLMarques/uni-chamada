import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { EnrollmentStatus } from '../../../../generated/prisma/enums';
import { PaginatedItems, makePagination } from '../../../shared/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseMapper } from '../mappers/course.mapper';
import { CourseFilter } from '../models/course.dto';
import {
  CourseEntity,
  CourseStats,
  CourseWithStats,
  EMPTY_COURSE_STATS,
} from '../models/course.entity';

@Injectable()
export class CourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(course: Omit<CourseEntity, 'id'>): Promise<CourseEntity> {
    const created = await this.prisma.course.create({
      data: {
        teacherId: course.teacherId,
        code: course.code,
        name: course.name,
        term: course.term,
        period: course.period,
        institution: course.institution,
      },
    });
    return CourseMapper.modelToEntity(created);
  }

  async findByIdAndTeacher(id: string, teacherId: string): Promise<CourseEntity | null> {
    const course = await this.prisma.course.findFirst({ where: { id, teacherId } });
    if (!course) return null;
    return CourseMapper.modelToEntity(course);
  }

  async findSummaryByIdAndTeacher(id: string, teacherId: string): Promise<CourseWithStats | null> {
    const course = await this.findByIdAndTeacher(id, teacherId);
    if (!course) return null;

    const stats = await this.loadStats([course.id]);
    return { ...course, stats: stats.get(course.id) ?? { ...EMPTY_COURSE_STATS } };
  }

  async findDuplicate(
    teacherId: string,
    code: string,
    term: string,
    period: CourseEntity['period'],
  ): Promise<CourseEntity | null> {
    const course = await this.prisma.course.findUnique({
      where: { teacherId_code_term_period: { teacherId, code, term, period } },
    });
    if (!course) return null;
    return CourseMapper.modelToEntity(course);
  }

  async findAllByTeacher(
    teacherId: string,
    filter: CourseFilter,
  ): Promise<PaginatedItems<CourseWithStats>> {
    const where: Prisma.CourseWhereInput = { teacherId };

    if (filter.query) {
      where.OR = [
        { name: { contains: filter.query, mode: 'insensitive' } },
        { code: { contains: filter.query, mode: 'insensitive' } },
      ];
    }
    if (filter.term) where.term = filter.term;
    if (filter.period) where.period = filter.period;
    if (filter.institution) where.institution = filter.institution;

    const [items, totalItems] = await Promise.all([
      this.prisma.course.findMany({
        where,
        orderBy: [{ term: 'desc' }, { code: 'asc' }],
        take: filter.itemsPerPage,
        skip: (filter.page - 1) * filter.itemsPerPage,
      }),
      this.prisma.course.count({ where }),
    ]);

    const courses = items.map((item) => CourseMapper.modelToEntity(item));
    const stats = await this.loadStats(courses.map((course) => course.id));

    return {
      data: courses.map((course) => ({
        ...course,
        stats: stats.get(course.id) ?? { ...EMPTY_COURSE_STATS },
      })),
      pagination: makePagination(filter.page, filter.itemsPerPage, totalItems),
    };
  }

  async update(id: string, data: Partial<CourseEntity>): Promise<CourseEntity> {
    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        term: data.term,
        period: data.period,
        institution: data.institution,
      },
    });
    return CourseMapper.modelToEntity(updated);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.enrollment.deleteMany({ where: { courseId: id } }),
      this.prisma.course.delete({ where: { id } }),
    ]);
  }

  /** Três consultas agregadas para a lista inteira, nunca uma por turma. */
  private async loadStats(courseIds: string[]): Promise<Map<string, CourseStats>> {
    const stats = new Map<string, CourseStats>(
      courseIds.map((id) => [id, { ...EMPTY_COURSE_STATS }]),
    );
    if (courseIds.length === 0) return stats;

    const [enrolled, lastSessions, openSessions] = await Promise.all([
      this.prisma.enrollment.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds }, status: EnrollmentStatus.ACTIVE },
        _count: { _all: true },
      }),
      this.prisma.classSession.groupBy({
        by: ['courseId'],
        where: { courseId: { in: courseIds } },
        _max: { startsAt: true },
      }),
      this.prisma.classSession.findMany({
        where: { courseId: { in: courseIds }, openedAt: { not: null }, closedAt: null },
        select: { id: true, courseId: true },
      }),
    ]);

    for (const row of enrolled) {
      const entry = stats.get(row.courseId);
      if (entry) entry.enrolledCount = row._count._all;
    }
    for (const row of lastSessions) {
      const entry = stats.get(row.courseId);
      if (entry) entry.lastSessionAt = row._max.startsAt;
    }
    for (const row of openSessions) {
      const entry = stats.get(row.courseId);
      if (entry) entry.openSessionId = row.id;
    }

    return stats;
  }
}
