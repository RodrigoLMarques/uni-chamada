import { Injectable } from '@nestjs/common';
import { PaginatedItems } from '../../shared/pagination';
import { CoursesService } from '../courses/courses.service';
import { EnrollmentConflictException } from './exceptions/enrollment-conflict.exception';
import { EnrollmentNotFoundException } from './exceptions/enrollment-not-found.exception';
import {
  CreateEnrollmentDTO,
  CreateEnrollmentFromUnifespDTO,
  EnrollmentFilter,
  UpdateEnrollmentDTO,
} from './models/enrollment.dto';
import { EnrollmentEntity } from './models/enrollment.entity';
import { EnrollmentMapper } from './mappers/enrollment.mapper';
import type { EnrollmentDTO } from './models/enrollment.dto';
import { EnrollmentRepository } from './repositories/enrollment.repository';
import { StorageService } from '../storage/storage.service';
import { UnifespClientService } from '../unifesp/unifesp-client.service';
import { UnifespUnavailableException } from '../unifesp/exceptions/unifesp-unavailable.exception';
import { randomUUID } from 'node:crypto';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly coursesService: CoursesService,
    private readonly unifespClient: UnifespClientService,
    private readonly storageService: StorageService,
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

  async createFromUnifesp(
    teacherId: string,
    courseId: string,
    dto: CreateEnrollmentFromUnifespDTO,
  ): Promise<EnrollmentEntity> {
    await this.coursesService.findById(teacherId, courseId);

    const profile = await this.unifespClient.profile(dto.handle);
    const ra = dto.handle.split('|').pop();
    if (!ra || ra === 'null') throw new UnifespUnavailableException('handle_without_ra');

    const name = dto.name ?? (profile.name || null);
    if (!name) throw new UnifespUnavailableException('profile_without_name');

    const photoKey = await this.storeUnifespPhoto(ra, profile.photoPath);

    const student = await this.enrollmentRepository.upsertUnifespStudent({
      ra,
      name,
      email: dto.email ?? profile.email,
      photoKey,
      entryYear: profile.entryYear,
    });

    const existing = await this.enrollmentRepository.find(courseId, student.id);
    if (existing) return existing;

    return this.enrollmentRepository.create(courseId, student.id);
  }

  private async storeUnifespPhoto(ra: string, photoPath: string | null): Promise<string | null> {
    if (!photoPath || !this.storageService.configured) return null;

    const photo = await this.unifespClient.downloadPhoto(photoPath);
    if (!photo) return null;

    const extension = photo.contentType.includes('png') ? 'png' : 'jpg';
    const key = `students/${ra}-${randomUUID()}.${extension}`;

    return this.storageService.upload(key, photo.bytes, photo.contentType);
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

  toDTO(enrollment: EnrollmentEntity): EnrollmentDTO {
    return EnrollmentMapper.entityToDTO(enrollment);
  }

  toDTOList(enrollments: EnrollmentEntity[]): EnrollmentDTO[] {
    return enrollments.map((enrollment) => EnrollmentMapper.entityToDTO(enrollment));
  }

  async remove(teacherId: string, courseId: string, studentId: string): Promise<void> {
    await this.coursesService.findById(teacherId, courseId);

    if (!(await this.enrollmentRepository.find(courseId, studentId))) {
      throw new EnrollmentNotFoundException(studentId);
    }

    await this.enrollmentRepository.remove(courseId, studentId);
  }
}
