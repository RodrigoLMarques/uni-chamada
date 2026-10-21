import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { PaginationQuery } from '../../../shared/pagination';

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
}

export class UpdateMeDTO extends PartialType(OmitType(CreateUserDTO, ['password'])) {}

export class UpdateUserDTO extends UpdateMeDTO {}

export class UserFilter extends PaginationQuery {
  @IsOptional()
  @IsString()
  query?: string | null;
}

export type UserDTO = {
  id: number;
  name: string;
  email: string;
};
