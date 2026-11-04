import { BadRequestException, Injectable } from '@nestjs/common';
import { PaginatedItems } from '../../shared/pagination';
import { CoursesService } from '../courses/courses.service';
import { ClassSessionConflictException } from './exceptions/class-session-conflict.exception';
import { ClassSessionNotFoundException } from './exceptions/class-session-not-found.exception';
import { ClassSessionStateException } from './exceptions/class-session-state.exception';
import {
  ClassSessionFilter,
  CreateClassSessionDTO,
  OpenClassSessionDTO,
  UpdateClassSessionDTO,
} from './models/class-session.dto';
import { ClassSessionEntity, statusOf } from './models/class-session.entity';
import { ClassSessionRepository } from './repositories/class-session.repository';

@Injectable()
export class ClassSessionsService {
  constructor(
    private readonly classSessionRepository: ClassSessionRepository,
    private readonly coursesService: CoursesService,
  ) {}

  async create(
    teacherId: string,
    courseId: string,
    dto: CreateClassSessionDTO,
  ): Promise<ClassSessionEntity> {
    await this.coursesService.findById(teacherId, courseId);

    const startsAt = new Date(dto.startsAt);
    if (await this.classSessionRepository.findByStartsAt(courseId, startsAt)) {
      throw new ClassSessionConflictException();
    }

    return this.classSessionRepository.create(courseId, startsAt);
  }

  async findAll(
    teacherId: string,
    courseId: string,
    filter: ClassSessionFilter,
  ): Promise<PaginatedItems<ClassSessionEntity>> {
    await this.coursesService.findById(teacherId, courseId);
    return this.classSessionRepository.findAll(courseId, filter);
  }

  async findById(teacherId: string, courseId: string, id: string): Promise<ClassSessionEntity> {
    await this.coursesService.findById(teacherId, courseId);

    const session = await this.classSessionRepository.findById(courseId, id);
    if (!session) throw new ClassSessionNotFoundException(id);
    return session;
  }

  async update(
    teacherId: string,
    courseId: string,
    id: string,
    dto: UpdateClassSessionDTO,
  ): Promise<ClassSessionEntity> {
    const session = await this.findById(teacherId, courseId, id);

    const status = statusOf(session);
    if (status !== 'SCHEDULED') throw new ClassSessionStateException('reschedule', status);

    const startsAt = new Date(dto.startsAt);
    const duplicate = await this.classSessionRepository.findByStartsAt(courseId, startsAt);
    if (duplicate && duplicate.id !== session.id) throw new ClassSessionConflictException();

    return this.classSessionRepository.update(id, { startsAt });
  }

  async open(
    teacherId: string,
    courseId: string,
    id: string,
    dto: OpenClassSessionDTO,
  ): Promise<ClassSessionEntity> {
    const session = await this.findById(teacherId, courseId, id);

    const status = statusOf(session);
    if (status !== 'SCHEDULED') throw new ClassSessionStateException('open', status);

    if ((dto.latitude === undefined) !== (dto.longitude === undefined)) {
      throw new BadRequestException('latitude_and_longitude_must_come_together');
    }

    return this.classSessionRepository.update(id, {
      openedAt: new Date(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracyM: dto.accuracyM,
    });
  }

  async close(teacherId: string, courseId: string, id: string): Promise<ClassSessionEntity> {
    const session = await this.findById(teacherId, courseId, id);

    const status = statusOf(session);
    if (status !== 'OPEN') throw new ClassSessionStateException('close', status);

    return this.classSessionRepository.update(id, { closedAt: new Date() });
  }

  async confirm(teacherId: string, courseId: string, id: string): Promise<ClassSessionEntity> {
    const session = await this.findById(teacherId, courseId, id);

    const status = statusOf(session);
    if (status !== 'CLOSED') throw new ClassSessionStateException('confirm', status);

    return this.classSessionRepository.update(id, { confirmedAt: new Date() });
  }

  /** Desconsiderar uma chamada: some com ela e com as presenças registradas nela,
   *  em qualquer estado. Confirmada inclusive, porque é justamente o caso em que
   *  a aula não deveria ter entrado na frequência. Quem avisa do estrago é a
   *  confirmação na interface. */
  async remove(teacherId: string, courseId: string, id: string): Promise<void> {
    await this.findById(teacherId, courseId, id);
    await this.classSessionRepository.remove(id);
  }
}
