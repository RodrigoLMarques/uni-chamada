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
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() body: CreateClassSessionDTO,
  ): Promise<ClassSessionDTO> {
    const session = await this.classSessionsService.create(
      BigInt(teacher.id),
      BigInt(courseId),
      body,
    );
    return ClassSessionMapper.entityToDTO(session);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query() filter: ClassSessionFilter,
  ): Promise<PaginatedItems<ClassSessionDTO>> {
    const { data, pagination } = await this.classSessionsService.findAll(
      BigInt(teacher.id),
      BigInt(courseId),
      filter,
    );
    return { data: data.map((s) => ClassSessionMapper.entityToDTO(s)), pagination };
  }

  @Get(':sessionId')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ): Promise<ClassSessionDTO> {
    const session = await this.classSessionsService.findById(
      BigInt(teacher.id),
      BigInt(courseId),
      BigInt(sessionId),
    );
    return ClassSessionMapper.entityToDTO(session);
  }

  @Patch(':sessionId')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() body: UpdateClassSessionDTO,
  ): Promise<ClassSessionDTO> {
    const session = await this.classSessionsService.update(
      BigInt(teacher.id),
      BigInt(courseId),
      BigInt(sessionId),
      body,
    );
    return ClassSessionMapper.entityToDTO(session);
  }

  @Post(':sessionId/open')
  @HttpCode(HttpStatus.OK)
  async open(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() body: OpenClassSessionDTO,
  ): Promise<ClassSessionDTO> {
    const session = await this.classSessionsService.open(
      BigInt(teacher.id),
      BigInt(courseId),
      BigInt(sessionId),
      body,
    );
    return ClassSessionMapper.entityToDTO(session);
  }

  @Post(':sessionId/close')
  @HttpCode(HttpStatus.OK)
  async close(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ): Promise<ClassSessionDTO> {
    const session = await this.classSessionsService.close(
      BigInt(teacher.id),
      BigInt(courseId),
      BigInt(sessionId),
    );
    return ClassSessionMapper.entityToDTO(session);
  }

  @Post(':sessionId/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ): Promise<ClassSessionDTO> {
    const session = await this.classSessionsService.confirm(
      BigInt(teacher.id),
      BigInt(courseId),
      BigInt(sessionId),
    );
    return ClassSessionMapper.entityToDTO(session);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ): Promise<void> {
    await this.classSessionsService.remove(BigInt(teacher.id), BigInt(courseId), BigInt(sessionId));
  }
}
