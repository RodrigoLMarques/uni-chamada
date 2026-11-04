import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AttendanceService } from './attendance.service';
import { ScanDTO } from './models/attendance.dto';
import type { ScanContextDTO, ScanResponse } from './models/attendance.dto';

@Controller('scan')
@UseGuards(ThrottlerGuard)
export class ScanController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get(':token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ public: { limit: 60, ttl: 60000 } })
  context(@Param('token') token: string): Promise<ScanContextDTO> {
    return this.attendanceService.resolveScanContext(token);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ scan: { limit: 10, ttl: 60000 } })
  async scan(@Body() body: ScanDTO, @Ip() clientIp: string): Promise<ScanResponse> {
    const { attendance, studentName, deviceToken } = await this.attendanceService.scan(
      body,
      clientIp,
    );

    return {
      status: 'RECORDED',
      studentName,
      recordedAt: attendance.recordedAt.toISOString(),
      ...(deviceToken ? { deviceToken } : {}),
    };
  }
}
