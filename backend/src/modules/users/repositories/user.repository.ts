import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PaginatedItems, makePagination } from '../../../shared/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { UserMapper } from '../mappers/user.mapper';
import { UserFilter } from '../models/user.dto';
import { UserEntity } from '../models/user.entity';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: Omit<UserEntity, 'id'>): Promise<UserEntity> {
    const data = UserMapper.entityToModel(user);
    const created = await this.prisma.user.create({ data });
    return UserMapper.modelToEntity(created);
  }

  async findById(id: bigint): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return UserMapper.modelToEntity(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return UserMapper.modelToEntity(user);
  }

  async findAll(filter: UserFilter): Promise<PaginatedItems<UserEntity>> {
    const where: Prisma.UserWhereInput = {};

    if (filter.query) {
      where.OR = [
        { name: { contains: filter.query, mode: 'insensitive' } },
        { email: { contains: filter.query, mode: 'insensitive' } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: filter.itemsPerPage,
        skip: (filter.page - 1) * filter.itemsPerPage,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: items.map((item) => UserMapper.modelToEntity(item)),
      pagination: makePagination(filter.page, filter.itemsPerPage, totalItems),
    };
  }

  async update(id: bigint, data: Partial<UserEntity>): Promise<UserEntity> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
      },
    });
    return UserMapper.modelToEntity(updated);
  }

  async remove(id: bigint): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
