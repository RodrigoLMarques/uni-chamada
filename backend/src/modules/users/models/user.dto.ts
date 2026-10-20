import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { PaginationQuery } from '../../../shared/pagination';
import { UserRole } from './user.entity';

export class CreateUserDTO {
  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'email is required' })
  @IsEmail({}, { message: 'email must be a valid email' })
  email: string;

  @IsNotEmpty({ message: 'password is required' })
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateUserDTO extends PartialType(OmitType(CreateUserDTO, ['password'])) {}

export class UserFilter extends PaginationQuery {
  @IsOptional()
  @IsString()
  query?: string | null;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export type UserDTO = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};
