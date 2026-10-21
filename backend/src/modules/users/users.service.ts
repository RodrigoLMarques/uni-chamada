import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PaginatedItems } from '../../shared/pagination';
import { UserConflictException } from './exceptions/user-conflict.exception';
import { UserNotFoundException } from './exceptions/user-not-found.exception';
import { CreateUserDTO, UpdateMeDTO, UpdateUserDTO, UserFilter } from './models/user.dto';
import { UserEntity } from './models/user.entity';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateUserDTO): Promise<UserEntity> {
    if (await this.userRepository.findByEmail(dto.email)) {
      throw new UserConflictException('email');
    }

    const rounds = Number(this.configService.get('BCRYPT_ROUNDS', 10));
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    return this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
  }

  async findAll(filter: UserFilter): Promise<PaginatedItems<UserEntity>> {
    return this.userRepository.findAll(filter);
  }

  async findById(id: bigint): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new UserNotFoundException(id);
    return user;
  }

  async update(id: bigint, dto: UpdateUserDTO | UpdateMeDTO): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new UserNotFoundException(id);

    if (dto.email && dto.email !== user.email) {
      if (await this.userRepository.findByEmail(dto.email)) {
        throw new UserConflictException('email');
      }
    }

    return this.userRepository.update(id, dto);
  }

  async remove(id: bigint): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new UserNotFoundException(id);
    await this.userRepository.remove(id);
  }
}
