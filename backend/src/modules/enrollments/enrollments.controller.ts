import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UserPayload } from '../auth/models/auth.dto';
import { PaginatedItems } from '../../shared/pagination';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentMapper } from './mappers/enrollment.mapper';
import {
  CreateEnrollmentDTO,
  EnrollmentFilter,
  UpdateEnrollmentDTO,
} from './models/enrollment.dto';
import type { EnrollmentDTO } from './models/enrollment.dto';

@Controller('courses/:courseId/enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() body: CreateEnrollmentDTO,
  ): Promise<EnrollmentDTO> {
    const enrollment = await this.enrollmentsService.create(
      BigInt(teacher.id),
      BigInt(courseId),
      body,
    );
    return EnrollmentMapper.entityToDTO(enrollment);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query() filter: EnrollmentFilter,
  ): Promise<PaginatedItems<EnrollmentDTO>> {
    const { data, pagination } = await this.enrollmentsService.findAll(
      BigInt(teacher.id),
      BigInt(courseId),
      filter,
    );
    return {
      data: data.map((enrollment) => EnrollmentMapper.entityToDTO(enrollment)),
      pagination,
    };
  }

  @Patch(':studentId')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() body: UpdateEnrollmentDTO,
  ): Promise<EnrollmentDTO> {
    const enrollment = await this.enrollmentsService.updateStatus(
      BigInt(teacher.id),
      BigInt(courseId),
      BigInt(studentId),
      body,
    );
    return EnrollmentMapper.entityToDTO(enrollment);
  }

  @Delete(':studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ): Promise<void> {
    await this.enrollmentsService.remove(BigInt(teacher.id), BigInt(courseId), BigInt(studentId));
  }
}
