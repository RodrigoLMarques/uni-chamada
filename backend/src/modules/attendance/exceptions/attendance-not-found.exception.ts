import { NotFoundException } from '@nestjs/common';

export class AttendanceNotFoundException extends NotFoundException {
  constructor(studentId: string) {
    super(`Attendance for student ${studentId} not found in this class session`);
  }
}
