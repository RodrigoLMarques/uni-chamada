import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { PaginationQuery } from '../../../shared/pagination';
import { CLASS_SESSION_STATUSES } from './class-session.entity';
import type { ClassSessionStatus } from './class-session.entity';

export class CreateClassSessionDTO {
  @IsDateString({}, { message: 'startsAt must be an ISO date string' })
  startsAt: string;
}

export class UpdateClassSessionDTO {
  @IsDateString({}, { message: 'startsAt must be an ISO date string' })
  startsAt: string;
}

export class OpenClassSessionDTO {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  accuracyM?: number;
}

export class ClassSessionFilter extends PaginationQuery {
  @IsOptional()
  @IsIn(CLASS_SESSION_STATUSES)
  status?: ClassSessionStatus;
}

export type ClassSessionDTO = {
  id: string;
  courseId: string;
  startsAt: string;
  openedAt: string | null;
  closedAt: string | null;
  confirmedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  status: ClassSessionStatus;
};
