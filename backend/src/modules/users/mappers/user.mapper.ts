import { Prisma, User as UserModel } from '../../../../generated/prisma/client';
import { UserDTO } from '../models/user.dto';
import { UserEntity } from '../models/user.entity';

export class UserMapper {
  static modelToEntity(model: UserModel): UserEntity {
    return {
      id: model.id,
      name: model.name,
      email: model.email,
      passwordHash: model.passwordHash,
      createdAt: model.createdAt,
    };
  }

  static entityToModel(entity: Omit<UserEntity, 'id'>): Prisma.UserCreateInput {
    return {
      name: entity.name,
      email: entity.email,
      passwordHash: entity.passwordHash,
    };
  }

  static entityToDTO(entity: UserEntity): UserDTO {
    return {
      id: Number(entity.id),
      name: entity.name,
      email: entity.email,
    };
  }
}
