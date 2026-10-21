import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from '../../../shared/pagination';
import { CoursePeriod } from './course.entity';

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
}

export type CourseDTO = {
  id: number;
  code: string;
  name: string;
  term: string;
  period: CoursePeriod;
};
