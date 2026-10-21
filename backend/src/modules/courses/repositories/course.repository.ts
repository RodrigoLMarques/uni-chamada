import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PaginatedItems, makePagination } from '../../../shared/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseMapper } from '../mappers/course.mapper';
import { CourseFilter } from '../models/course.dto';
import { CourseEntity } from '../models/course.entity';

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
      },
    });
    return CourseMapper.modelToEntity(created);
  }

  async findByIdAndTeacher(id: bigint, teacherId: bigint): Promise<CourseEntity | null> {
    const course = await this.prisma.course.findFirst({ where: { id, teacherId } });
    if (!course) return null;
    return CourseMapper.modelToEntity(course);
  }

  async findDuplicate(
    teacherId: bigint,
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
    teacherId: bigint,
    filter: CourseFilter,
  ): Promise<PaginatedItems<CourseEntity>> {
    const where: Prisma.CourseWhereInput = { teacherId };

    if (filter.query) {
      where.OR = [
        { name: { contains: filter.query, mode: 'insensitive' } },
        { code: { contains: filter.query, mode: 'insensitive' } },
      ];
    }
    if (filter.term) where.term = filter.term;
    if (filter.period) where.period = filter.period;

    const [items, totalItems] = await Promise.all([
      this.prisma.course.findMany({
        where,
        orderBy: [{ term: 'desc' }, { code: 'asc' }],
        take: filter.itemsPerPage,
        skip: (filter.page - 1) * filter.itemsPerPage,
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: items.map((item) => CourseMapper.modelToEntity(item)),
      pagination: makePagination(filter.page, filter.itemsPerPage, totalItems),
    };
  }

  async update(id: bigint, data: Partial<CourseEntity>): Promise<CourseEntity> {
    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        term: data.term,
        period: data.period,
      },
    });
    return CourseMapper.modelToEntity(updated);
  }

  async remove(id: bigint): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.enrollment.deleteMany({ where: { courseId: id } }),
      this.prisma.course.delete({ where: { id } }),
    ]);
  }
}
