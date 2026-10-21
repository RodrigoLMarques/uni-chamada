import { Injectable } from '@nestjs/common';
import { User } from '../../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updatePassword(id: bigint, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }
}
