import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PaginatedItems, makePagination } from '../../../shared/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { EnrollmentMapper } from '../mappers/enrollment.mapper';
import { EnrollmentEntity, StudentEntity } from '../models/enrollment.entity';
import {
  CreateEnrollmentDTO,
  EnrollmentFilter,
  UpdateEnrollmentDTO,
} from '../models/enrollment.dto';

@Injectable()
export class EnrollmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateStudent(dto: CreateEnrollmentDTO): Promise<StudentEntity> {
    const existing = await this.prisma.student.findUnique({ where: { ra: dto.ra } });

    if (!existing) {
      const created = await this.prisma.student.create({
        data: {
          ra: dto.ra,
          name: dto.name,
          email: dto.email,
          photoUrl: dto.photoUrl,
          entryYear: dto.entryYear,
        },
      });
      return EnrollmentMapper.studentModelToEntity(created);
    }

    const missing: Prisma.StudentUpdateInput = {};
    if (existing.email === null && dto.email !== undefined) missing.email = dto.email;
    if (existing.photoUrl === null && dto.photoUrl !== undefined) missing.photoUrl = dto.photoUrl;
    if (existing.entryYear === null && dto.entryYear !== undefined) {
      missing.entryYear = dto.entryYear;
    }

    if (Object.keys(missing).length === 0) {
      return EnrollmentMapper.studentModelToEntity(existing);
    }

    const completed = await this.prisma.student.update({
      where: { id: existing.id },
      data: missing,
    });
    return EnrollmentMapper.studentModelToEntity(completed);
  }

  async find(courseId: string, studentId: string): Promise<EnrollmentEntity | null> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
      include: { student: true },
    });
    if (!enrollment) return null;
    return {
      courseId: enrollment.courseId,
      studentId: enrollment.studentId,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      student: EnrollmentMapper.studentModelToEntity(enrollment.student),
    };
  }

  async create(courseId: string, studentId: string): Promise<EnrollmentEntity> {
    const created = await this.prisma.enrollment.create({
      data: { courseId, studentId },
      include: { student: true },
    });
    return {
      courseId: created.courseId,
      studentId: created.studentId,
      status: created.status,
      enrolledAt: created.enrolledAt,
      student: EnrollmentMapper.studentModelToEntity(created.student),
    };
  }

  async findAll(
    courseId: string,
    filter: EnrollmentFilter,
  ): Promise<PaginatedItems<EnrollmentEntity>> {
    const where: Prisma.EnrollmentWhereInput = { courseId };

    if (filter.status) where.status = filter.status;
    if (filter.query) {
      where.student = {
        OR: [
          { name: { contains: filter.query, mode: 'insensitive' } },
          { ra: { contains: filter.query, mode: 'insensitive' } },
          { email: { contains: filter.query, mode: 'insensitive' } },
        ],
      };
    }

    const [items, totalItems] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        include: { student: true },
        orderBy: { student: { name: 'asc' } },
        take: filter.itemsPerPage,
        skip: (filter.page - 1) * filter.itemsPerPage,
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return {
      data: items.map((item) => ({
        courseId: item.courseId,
        studentId: item.studentId,
        status: item.status,
        enrolledAt: item.enrolledAt,
        student: EnrollmentMapper.studentModelToEntity(item.student),
      })),
      pagination: makePagination(filter.page, filter.itemsPerPage, totalItems),
    };
  }

  async update(
    courseId: string,
    studentId: string,
    data: UpdateEnrollmentDTO,
  ): Promise<EnrollmentEntity> {
    const student: Prisma.StudentUpdateInput = {};
    if (data.name !== undefined) student.name = data.name;
    if (data.email !== undefined) student.email = data.email;
    if (data.photoUrl !== undefined) student.photoUrl = data.photoUrl;
    if (data.entryYear !== undefined) student.entryYear = data.entryYear;

    if (Object.keys(student).length > 0) {
      await this.prisma.student.update({ where: { id: studentId }, data: student });
    }

    const updated = await this.prisma.enrollment.update({
      where: { courseId_studentId: { courseId, studentId } },
      data: data.status === undefined ? {} : { status: data.status },
      include: { student: true },
    });
    return {
      courseId: updated.courseId,
      studentId: updated.studentId,
      status: updated.status,
      enrolledAt: updated.enrolledAt,
      student: EnrollmentMapper.studentModelToEntity(updated.student),
    };
  }

  async remove(courseId: string, studentId: string): Promise<void> {
    await this.prisma.enrollment.delete({
      where: { courseId_studentId: { courseId, studentId } },
    });
  }
}
