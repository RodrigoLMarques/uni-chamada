import { Module } from '@nestjs/common';
import { ClassSessionsModule } from '../class-sessions/class-sessions.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { QrTokenService } from './qr/qr-token.service';
import { AttendanceRepository } from './repositories/attendance.repository';
import { StudentDeviceRepository } from './repositories/student-device.repository';
import { ScanController } from './scan.controller';

@Module({
  imports: [ClassSessionsModule],
  controllers: [AttendanceController, ScanController],
  providers: [AttendanceService, AttendanceRepository, StudentDeviceRepository, QrTokenService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
