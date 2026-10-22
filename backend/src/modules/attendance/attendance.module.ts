import { Module } from '@nestjs/common';
import { ClassSessionsModule } from '../class-sessions/class-sessions.module';
import { CoursesModule } from '../courses/courses.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { CourseReportController } from './course-report.controller';
import { QrTokenService } from './qr/qr-token.service';
import { AttendanceRepository } from './repositories/attendance.repository';
import { StudentDeviceRepository } from './repositories/student-device.repository';
import { ScanController } from './scan.controller';
import { StudentAttendanceController } from './student-attendance.controller';

@Module({
  imports: [ClassSessionsModule, CoursesModule],
  controllers: [
    AttendanceController,
    CourseReportController,
    ScanController,
    StudentAttendanceController,
  ],
  providers: [AttendanceService, AttendanceRepository, StudentDeviceRepository, QrTokenService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
