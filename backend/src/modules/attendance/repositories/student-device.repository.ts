import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashDeviceToken } from './attendance.repository';

export type StudentDeviceEntity = {
  id: string;
  studentId: string;
};

@Injectable()
export class StudentDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByToken(token: string): Promise<StudentDeviceEntity | null> {
    const device = await this.prisma.studentDevice.findUnique({
      where: { tokenHash: hashDeviceToken(token) },
      select: { id: true, studentId: true, revokedAt: true },
    });
    if (!device || device.revokedAt !== null) return null;
    return { id: device.id, studentId: device.studentId };
  }

  async create(studentId: string, tokenHash: string): Promise<StudentDeviceEntity> {
    const created = await this.prisma.studentDevice.create({
      data: { studentId, tokenHash },
      select: { id: true, studentId: true },
    });
    return created;
  }
}
