import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PaginatedItems, makePagination } from '../../../shared/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassSessionMapper } from '../mappers/class-session.mapper';
import { ClassSessionFilter } from '../models/class-session.dto';
import { ClassSessionEntity } from '../models/class-session.entity';

@Injectable()
export class ClassSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(courseId: string, startsAt: Date): Promise<ClassSessionEntity> {
    const created = await this.prisma.classSession.create({ data: { courseId, startsAt } });
    return ClassSessionMapper.modelToEntity(created);
  }

  async findById(courseId: string, id: string): Promise<ClassSessionEntity | null> {
    const session = await this.prisma.classSession.findFirst({ where: { id, courseId } });
    if (!session) return null;
    return ClassSessionMapper.modelToEntity(session, await this.countPresencesOf(session.id));
  }

  async findByStartsAt(courseId: string, startsAt: Date): Promise<ClassSessionEntity | null> {
    const session = await this.prisma.classSession.findUnique({
      where: { courseId_startsAt: { courseId, startsAt } },
    });
    if (!session) return null;
    return ClassSessionMapper.modelToEntity(session);
  }

  async findAll(
    courseId: string,
    filter: ClassSessionFilter,
  ): Promise<PaginatedItems<ClassSessionEntity>> {
    const where: Prisma.ClassSessionWhereInput = { courseId };

    if (filter.status === 'SCHEDULED') where.openedAt = null;
    if (filter.status === 'OPEN') {
      where.openedAt = { not: null };
      where.closedAt = null;
    }
    if (filter.status === 'CLOSED') {
      where.closedAt = { not: null };
      where.confirmedAt = null;
    }
    if (filter.status === 'CONFIRMED') where.confirmedAt = { not: null };

    const [items, totalItems] = await Promise.all([
      this.prisma.classSession.findMany({
        where,
        orderBy: { startsAt: 'desc' },
        take: filter.itemsPerPage,
        skip: (filter.page - 1) * filter.itemsPerPage,
      }),
      this.prisma.classSession.count({ where }),
    ]);

    const presentCounts = await this.countPresences(items.map((item) => item.id));

    return {
      data: items.map((item) =>
        ClassSessionMapper.modelToEntity(item, presentCounts.get(item.id) ?? 0),
      ),
      pagination: makePagination(filter.page, filter.itemsPerPage, totalItems),
    };
  }

  async update(id: string, data: Prisma.ClassSessionUpdateInput): Promise<ClassSessionEntity> {
    const updated = await this.prisma.classSession.update({ where: { id }, data });
    return ClassSessionMapper.modelToEntity(updated, await this.countPresencesOf(updated.id));
  }

  async remove(id: string): Promise<void> {
    await this.prisma.classSession.delete({ where: { id } });
  }

  private countPresencesOf(sessionId: string): Promise<number> {
    return this.prisma.attendance.count({ where: { classSessionId: sessionId } });
  }

  /** Uma consulta agregada para a página inteira, nunca uma por chamada. */
  private async countPresences(sessionIds: string[]): Promise<Map<string, number>> {
    if (sessionIds.length === 0) return new Map();

    const rows = await this.prisma.attendance.groupBy({
      by: ['classSessionId'],
      where: { classSessionId: { in: sessionIds } },
      _count: { _all: true },
    });

    return new Map(rows.map((row) => [row.classSessionId, row._count._all]));
  }
}
