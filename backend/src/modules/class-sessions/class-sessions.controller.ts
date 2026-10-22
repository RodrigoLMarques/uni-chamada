import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UserPayload } from '../auth/models/auth.dto';
import { PaginatedItems } from '../../shared/pagination';
import { ClassSessionsService } from './class-sessions.service';
import { ClassSessionMapper } from './mappers/class-session.mapper';
import {
  ClassSessionFilter,
  CreateClassSessionDTO,
  OpenClassSessionDTO,
  UpdateClassSessionDTO,
} from './models/class-session.dto';
import type { ClassSessionDTO } from './models/class-session.dto';

@Controller('courses/:courseId/sessions')
@UseGuards(JwtAuthGuard)
export class ClassSessionsController {
  constructor(private readonly classSessionsService: ClassSessionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Body() body: CreateClassSessionDTO,
  ): Promise<ClassSessionDTO> {
    const session = await this.classSessionsService.create(teacher.id, courseId, body);
    return ClassSessionMapper.entityToDTO(session);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Query() filter: ClassSessionFilter,
  ): Promise<PaginatedItems<ClassSessionDTO>> {
    const { data, pagination } = await this.classSessionsService.findAll(
      teacher.id,
      courseId,
      filter,
    );
    return { data: data.map((s) => ClassSessionMapper.entityToDTO(s)), pagination };
  }

  @Get(':sessionId')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<ClassSessionDTO> {
    const session = await this.classSessionsService.findById(teacher.id, courseId, sessionId);
    return ClassSessionMapper.entityToDTO(session);
  }

  @Patch(':sessionId')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateClassSessionDTO,
  ): Promise<ClassSessionDTO> {
    const session = await this.classSessionsService.update(teacher.id, courseId, sessionId, body);
    return ClassSessionMapper.entityToDTO(session);
  }

  @Post(':sessionId/open')
  @HttpCode(HttpStatus.OK)
  async open(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: OpenClassSessionDTO,
  ): Promise<ClassSessionDTO> {
    const session = await this.classSessionsService.open(teacher.id, courseId, sessionId, body);
    return ClassSessionMapper.entityToDTO(session);
  }

  @Post(':sessionId/close')
  @HttpCode(HttpStatus.OK)
  async close(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<ClassSessionDTO> {
    const session = await this.classSessionsService.close(teacher.id, courseId, sessionId);
    return ClassSessionMapper.entityToDTO(session);
  }

  @Post(':sessionId/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<ClassSessionDTO> {
    const session = await this.classSessionsService.confirm(teacher.id, courseId, sessionId);
    return ClassSessionMapper.entityToDTO(session);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.classSessionsService.remove(teacher.id, courseId, sessionId);
  }
}
