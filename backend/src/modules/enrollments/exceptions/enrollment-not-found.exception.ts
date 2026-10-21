import { NotFoundException } from '@nestjs/common';

export class EnrollmentNotFoundException extends NotFoundException {
  constructor(studentId: bigint | number) {
    super(`Enrollment for student ${studentId} not found in this course`);
  }
}
