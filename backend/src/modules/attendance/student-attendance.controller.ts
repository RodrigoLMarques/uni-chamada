import { Controller, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PaginatedItems, PaginationQuery } from '../../shared/pagination';
import { AttendanceService } from './attendance.service';
import type { StudentAttendanceDTO, StudentSessionDTO } from './models/attendance.dto';

@Controller('students/:ra')
@UseGuards(ThrottlerGuard)
@Throttle({ public: { limit: 60, ttl: 60000 } })
export class StudentAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('attendance')
  @HttpCode(HttpStatus.OK)
  attendance(@Param('ra') ra: string): Promise<StudentAttendanceDTO> {
    return this.attendanceService.studentAttendance(ra);
  }

  @Get('courses/:courseId/attendance')
  @HttpCode(HttpStatus.OK)
  courseAttendance(
    @Param('ra') ra: string,
    @Param('courseId') courseId: string,
    @Query() filter: PaginationQuery,
  ): Promise<PaginatedItems<StudentSessionDTO>> {
    return this.attendanceService.studentCourseSessions(ra, courseId, filter);
  }
}
