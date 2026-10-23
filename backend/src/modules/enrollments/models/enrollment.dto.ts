import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQuery } from '../../../shared/pagination';
import { EnrollmentStatus } from './enrollment.entity';

export class CreateEnrollmentDTO {
  @IsNotEmpty({ message: 'ra is required' })
  @IsString()
  ra: string;

  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email' })
  email?: string;

  @IsOptional()
  @IsUrl({}, { message: 'photoUrl must be a valid url' })
  photoUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  entryYear?: number;
}

export class CreateEnrollmentFromUnifespDTO {
  @IsNotEmpty({ message: 'handle is required' })
  @IsString()
  @MaxLength(2048)
  handle: string;

  @IsOptional()
  @IsNotEmpty({ message: 'name must not be empty' })
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email' })
  email?: string;
}

export class UpdateEnrollmentDTO {
  @IsOptional()
  @IsEnum(EnrollmentStatus, { message: 'status must be ACTIVE or DROPPED' })
  status?: EnrollmentStatus;

  @IsOptional()
  @IsNotEmpty({ message: 'name must not be empty' })
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email' })
  email?: string | null;

  @IsOptional()
  @IsUrl({}, { message: 'photoUrl must be a valid url' })
  photoUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  entryYear?: number | null;
}

export class EnrollmentFilter extends PaginationQuery {
  @IsOptional()
  @IsString()
  query?: string | null;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}

export type EnrollmentDTO = {
  student: {
    id: string;
    ra: string;
    name: string;
    email: string | null;
    photoUrl: string | null;
    photoKey?: string | null;
    entryYear: number | null;
  };
  status: EnrollmentStatus;
  enrolledAt: string | null;
};
