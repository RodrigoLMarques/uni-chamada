import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { UserPayload } from '../auth/models/auth.dto';
import { PaginatedItems } from '../../shared/pagination';
import { AttendanceService } from './attendance.service';
import { AttendanceMapper } from './mappers/attendance.mapper';
import {
  AttendanceFilter,
  BulkManualAttendanceDTO,
  CreateManualAttendanceDTO,
  RollFilter,
} from './models/attendance.dto';
import type {
  AttendanceDTO,
  BulkManualAttendanceResultDTO,
  QrTokenDTO,
  RollEntryDTO,
  RollSummaryDTO,
} from './models/attendance.dto';

@Controller('courses/:courseId/sessions/:sessionId')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('qr')
  @HttpCode(HttpStatus.OK)
  currentQrToken(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<QrTokenDTO> {
    return this.attendanceService.currentQrToken(teacher.id, courseId, sessionId);
  }

  @Get('attendance')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
    @Query() filter: AttendanceFilter,
  ): Promise<PaginatedItems<AttendanceDTO>> {
    const listing = await this.attendanceService.findAll(teacher.id, courseId, sessionId, filter);
    return this.attendanceService.toDTO(listing);
  }

  @Get('roll')
  @HttpCode(HttpStatus.OK)
  async roll(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
    @Query() filter: RollFilter,
  ): Promise<{
    data: RollEntryDTO[];
    pagination: PaginatedItems<RollEntryDTO>['pagination'];
    summary: RollSummaryDTO;
  }> {
    const listing = await this.attendanceService.roll(teacher.id, courseId, sessionId, filter);
    return this.attendanceService.rollToDTO(listing);
  }

  @Post('attendance/bulk')
  @HttpCode(HttpStatus.OK)
  createManualBulk(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: BulkManualAttendanceDTO,
  ): Promise<BulkManualAttendanceResultDTO> {
    return this.attendanceService.createManualBulk(teacher.id, courseId, sessionId, body);
  }

  @Post('attendance')
  @HttpCode(HttpStatus.CREATED)
  async createManual(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: CreateManualAttendanceDTO,
  ): Promise<AttendanceDTO> {
    const attendance = await this.attendanceService.createManual(
      teacher.id,
      courseId,
      sessionId,
      body,
    );
    return AttendanceMapper.entityToDTO(attendance, {}, { radiusM: 0, sharedDeviceIds: new Set() });
  }

  @Delete('attendance/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() teacher: UserPayload,
    @Param('courseId') courseId: string,
    @Param('sessionId') sessionId: string,
    @Param('studentId') studentId: string,
  ): Promise<void> {
    await this.attendanceService.remove(teacher.id, courseId, sessionId, studentId);
  }
}
