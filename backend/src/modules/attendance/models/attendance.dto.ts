import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQuery } from '../../../shared/pagination';
import type { AttendanceFlags, AttendanceMethod } from './attendance.entity';

export class ScanDTO {
  @IsNotEmpty({ message: 'token is required' })
  @IsString()
  @MaxLength(128)
  token: string;

  @IsNotEmpty({ message: 'ra is required' })
  @IsString()
  @MaxLength(32)
  ra: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceToken?: string;

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

export class CreateManualAttendanceDTO {
  @IsNotEmpty({ message: 'ra is required' })
  @IsString()
  @MaxLength(32)
  ra: string;
}

export class AttendanceFilter extends PaginationQuery {}

export const ROLL_STATUSES = ['PRESENT', 'ABSENT'] as const;

export type RollStatus = (typeof ROLL_STATUSES)[number];

export class RollFilter extends PaginationQuery {
  @IsOptional()
  @IsIn(ROLL_STATUSES)
  status?: RollStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  query?: string;
}

export class BulkManualAttendanceDTO {
  @IsArray()
  @ArrayNotEmpty({ message: 'ras must not be empty' })
  @ArrayMaxSize(200)
  @IsString({ each: true })
  ras: string[];
}

export type ScanResponse = {
  status: 'RECORDED';
  studentName: string;
  recordedAt: string;
  deviceToken?: string;
};

export type QrTokenDTO = {
  token: string;
  windowSeconds: number;
  expiresAt: string;
};

export type RollEntryDTO = {
  student: { id: string; ra: string; name: string; photoUrl: string | null };
  status: RollStatus;
  method: AttendanceMethod | null;
  recordedAt: string | null;
  distanceM: number | null;
  flags: AttendanceFlags | null;
};

export type RollSummaryDTO = {
  enrolled: number;
  present: number;
  absent: number;
};

export type BulkManualAttendanceResultDTO = {
  recorded: string[];
  skipped: { ra: string; reason: 'NOT_ENROLLED' | 'ALREADY_REGISTERED' }[];
};

export type AttendanceDTO = {
  student: { id: string; ra: string; name: string; photoUrl: string | null };
  method: AttendanceMethod;
  recordedAt: string;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  distanceM: number | null;
  flags: AttendanceFlags;
};
