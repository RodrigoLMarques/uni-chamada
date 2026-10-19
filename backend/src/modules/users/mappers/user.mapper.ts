import { Prisma, User as UserModel } from '../../../../generated/prisma/client';
import { UserDTO } from '../models/user.dto';
import { UserEntity } from '../models/user.entity';

export class UserMapper {
  static modelToEntity(model: UserModel): UserEntity {
    return {
      id: model.id,
      name: model.name,
      email: model.email,
      password: model.password,
      role: model.role,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      deletedAt: model.deletedAt,
    };
  }

  static entityToModel(entity: UserEntity): Prisma.UserCreateInput {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      password: entity.password,
      role: entity.role,
    };
  }

  static entityToDTO(entity: UserEntity): UserDTO {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      role: entity.role,
    };
  }
}
