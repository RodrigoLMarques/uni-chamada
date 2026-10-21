import { Injectable } from '@nestjs/common';
import { PaginatedItems } from '../../shared/pagination';
import { CourseConflictException } from './exceptions/course-conflict.exception';
import { CourseNotFoundException } from './exceptions/course-not-found.exception';
import { CourseFilter, CreateCourseDTO, UpdateCourseDTO } from './models/course.dto';
import { CourseEntity } from './models/course.entity';
import { CourseRepository } from './repositories/course.repository';

@Injectable()
export class CoursesService {
  constructor(private readonly courseRepository: CourseRepository) {}

  async create(teacherId: bigint, dto: CreateCourseDTO): Promise<CourseEntity> {
    const duplicate = await this.courseRepository.findDuplicate(
      teacherId,
      dto.code,
      dto.term,
      dto.period,
    );
    if (duplicate) throw new CourseConflictException();

    return this.courseRepository.create({
      teacherId,
      code: dto.code,
      name: dto.name,
      term: dto.term,
      period: dto.period,
    });
  }

  async findAll(teacherId: bigint, filter: CourseFilter): Promise<PaginatedItems<CourseEntity>> {
    return this.courseRepository.findAllByTeacher(teacherId, filter);
  }

  async findById(teacherId: bigint, id: bigint): Promise<CourseEntity> {
    const course = await this.courseRepository.findByIdAndTeacher(id, teacherId);
    if (!course) throw new CourseNotFoundException(id);
    return course;
  }

  async update(teacherId: bigint, id: bigint, dto: UpdateCourseDTO): Promise<CourseEntity> {
    const course = await this.findById(teacherId, id);

    const code = dto.code ?? course.code;
    const term = dto.term ?? course.term;
    const period = dto.period ?? course.period;

    if (code !== course.code || term !== course.term || period !== course.period) {
      const duplicate = await this.courseRepository.findDuplicate(teacherId, code, term, period);
      if (duplicate && duplicate.id !== course.id) throw new CourseConflictException();
    }

    return this.courseRepository.update(id, dto);
  }

  async remove(teacherId: bigint, id: bigint): Promise<void> {
    await this.findById(teacherId, id);
    await this.courseRepository.remove(id);
  }
}
