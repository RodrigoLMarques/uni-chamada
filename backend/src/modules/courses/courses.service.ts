import { Injectable } from '@nestjs/common';
import { PaginatedItems } from '../../shared/pagination';
import { CourseConflictException } from './exceptions/course-conflict.exception';
import { CourseNotFoundException } from './exceptions/course-not-found.exception';
import { CourseFilter, CreateCourseDTO, UpdateCourseDTO } from './models/course.dto';
import {
  CourseEntity,
  CourseWithStats,
  EMPTY_COURSE_STATS,
  Institution,
} from './models/course.entity';
import { CourseRepository } from './repositories/course.repository';

@Injectable()
export class CoursesService {
  constructor(private readonly courseRepository: CourseRepository) {}

  async create(teacherId: string, dto: CreateCourseDTO): Promise<CourseWithStats> {
    const duplicate = await this.courseRepository.findDuplicate(
      teacherId,
      dto.code,
      dto.term,
      dto.period,
    );
    if (duplicate) throw new CourseConflictException();

    const created = await this.courseRepository.create({
      teacherId,
      code: dto.code,
      name: dto.name,
      term: dto.term,
      period: dto.period,
      institution: dto.institution ?? Institution.OTHER,
    });

    // Turma recém-criada não tem matrícula nem chamada: não vale uma consulta.
    return { ...created, stats: { ...EMPTY_COURSE_STATS } };
  }

  async findAll(teacherId: string, filter: CourseFilter): Promise<PaginatedItems<CourseWithStats>> {
    return this.courseRepository.findAllByTeacher(teacherId, filter);
  }

  async findById(teacherId: string, id: string): Promise<CourseWithStats> {
    const course = await this.courseRepository.findSummaryByIdAndTeacher(id, teacherId);
    if (!course) throw new CourseNotFoundException(id);
    return course;
  }

  async update(teacherId: string, id: string, dto: UpdateCourseDTO): Promise<CourseWithStats> {
    const course = await this.requireCourse(teacherId, id);

    const code = dto.code ?? course.code;
    const term = dto.term ?? course.term;
    const period = dto.period ?? course.period;

    if (code !== course.code || term !== course.term || period !== course.period) {
      const duplicate = await this.courseRepository.findDuplicate(teacherId, code, term, period);
      if (duplicate && duplicate.id !== course.id) throw new CourseConflictException();
    }

    await this.courseRepository.update(id, dto);
    return this.findById(teacherId, id);
  }

  async remove(teacherId: string, id: string): Promise<void> {
    await this.requireCourse(teacherId, id);
    await this.courseRepository.remove(id);
  }

  /** Checagem de posse sem carregar as contagens, que update e remove não usam. */
  private async requireCourse(teacherId: string, id: string): Promise<CourseEntity> {
    const course = await this.courseRepository.findByIdAndTeacher(id, teacherId);
    if (!course) throw new CourseNotFoundException(id);
    return course;
  }
}
