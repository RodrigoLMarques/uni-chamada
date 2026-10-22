import { Injectable } from '@nestjs/common';
import { PaginatedItems } from '../../shared/pagination';
import { CoursesService } from '../courses/courses.service';
import { EnrollmentConflictException } from './exceptions/enrollment-conflict.exception';
import { EnrollmentNotFoundException } from './exceptions/enrollment-not-found.exception';
import {
  CreateEnrollmentDTO,
  EnrollmentFilter,
  UpdateEnrollmentDTO,
} from './models/enrollment.dto';
import { EnrollmentEntity } from './models/enrollment.entity';
import { EnrollmentRepository } from './repositories/enrollment.repository';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly coursesService: CoursesService,
  ) {}

  async create(
    teacherId: string,
    courseId: string,
    dto: CreateEnrollmentDTO,
  ): Promise<EnrollmentEntity> {
    await this.coursesService.findById(teacherId, courseId);

    const student = await this.enrollmentRepository.findOrCreateStudent(dto);

    if (await this.enrollmentRepository.find(courseId, student.id)) {
      throw new EnrollmentConflictException(dto.ra);
    }

    return this.enrollmentRepository.create(courseId, student.id);
  }

  async findAll(
    teacherId: string,
    courseId: string,
    filter: EnrollmentFilter,
  ): Promise<PaginatedItems<EnrollmentEntity>> {
    await this.coursesService.findById(teacherId, courseId);
    return this.enrollmentRepository.findAll(courseId, filter);
  }

  async update(
    teacherId: string,
    courseId: string,
    studentId: string,
    dto: UpdateEnrollmentDTO,
  ): Promise<EnrollmentEntity> {
    await this.coursesService.findById(teacherId, courseId);

    if (!(await this.enrollmentRepository.find(courseId, studentId))) {
      throw new EnrollmentNotFoundException(studentId);
    }

    return this.enrollmentRepository.update(courseId, studentId, dto);
  }

  async remove(teacherId: string, courseId: string, studentId: string): Promise<void> {
    await this.coursesService.findById(teacherId, courseId);

    if (!(await this.enrollmentRepository.find(courseId, studentId))) {
      throw new EnrollmentNotFoundException(studentId);
    }

    await this.enrollmentRepository.remove(courseId, studentId);
  }
}
