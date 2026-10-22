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
import { CoursesService } from './courses.service';
import { CourseMapper } from './mappers/course.mapper';
import { CourseFilter, CreateCourseDTO, UpdateCourseDTO } from './models/course.dto';
import type { CourseDTO } from './models/course.dto';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() teacher: UserPayload,
    @Body() body: CreateCourseDTO,
  ): Promise<CourseDTO> {
    const course = await this.coursesService.create(teacher.id, body);
    return CourseMapper.entityToDTO(course);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser() teacher: UserPayload,
    @Query() filter: CourseFilter,
  ): Promise<PaginatedItems<CourseDTO>> {
    const { data, pagination } = await this.coursesService.findAll(teacher.id, filter);
    return { data: data.map((course) => CourseMapper.entityToDTO(course)), pagination };
  }

  @Get(':courseId')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
  ): Promise<CourseDTO> {
    const course = await this.coursesService.findById(teacher.id, courseId);
    return CourseMapper.entityToDTO(course);
  }

  @Patch(':courseId')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Body() body: UpdateCourseDTO,
  ): Promise<CourseDTO> {
    const course = await this.coursesService.update(teacher.id, courseId, body);
    return CourseMapper.entityToDTO(course);
  }

  @Delete(':courseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
  ): Promise<void> {
    await this.coursesService.remove(teacher.id, courseId);
  }
}
