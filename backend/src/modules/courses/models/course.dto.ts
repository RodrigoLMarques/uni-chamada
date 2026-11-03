import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '../../../shared/pagination';
import { CoursePeriod, Institution } from './course.entity';

export class CreateCourseDTO {
  @IsNotEmpty({ message: 'code is required' })
  @IsString()
  code: string;

  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'term is required' })
  @IsString()
  term: string;

  @IsEnum(CoursePeriod, { message: 'period must be FULL_TIME or EVENING' })
  period: CoursePeriod;

  @IsOptional()
  @IsEnum(Institution, { message: 'institution must be UNIFESP or OTHER' })
  institution?: Institution;
}

export class UpdateCourseDTO extends PartialType(CreateCourseDTO) {}

export class CourseFilter extends PaginationQuery {
  @IsOptional()
  @IsString()
  query?: string | null;

  @IsOptional()
  @IsString()
  term?: string;

  @IsOptional()
  @IsEnum(CoursePeriod)
  period?: CoursePeriod;

  @IsOptional()
  @IsEnum(Institution)
  institution?: Institution;
}

export type CourseDTO = {
  id: string;
  code: string;
  name: string;
  term: string;
  period: CoursePeriod;
  institution: Institution;
  enrolledCount: number;
  lastSessionAt: string | null;
  openSessionId: string | null;
};
