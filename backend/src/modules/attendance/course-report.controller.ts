import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UserPayload } from '../auth/models/auth.dto';
import { AttendanceService } from './attendance.service';
import { PaginationQuery } from '../../shared/pagination';
import { CourseReportFilter } from './models/attendance.dto';
import type { CourseReportDTO, StudentReportDTO } from './models/attendance.dto';

@Controller('courses/:courseId/report')
@UseGuards(JwtAuthGuard)
export class CourseReportController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  report(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Query() filter: CourseReportFilter,
  ): Promise<CourseReportDTO> {
    return this.attendanceService.courseReport(teacher.id, courseId, filter);
  }

  @Get('students/:studentId')
  @HttpCode(HttpStatus.OK)
  student(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
    @Query() filter: PaginationQuery,
  ): Promise<StudentReportDTO> {
    return this.attendanceService.studentCourseReport(teacher.id, courseId, studentId, filter);
  }
}
