import { NotFoundException } from '@nestjs/common';

export class EnrollmentNotFoundException extends NotFoundException {
  constructor(studentId: string | number) {
    super(`Enrollment for student ${studentId} not found in this course`);
  }
}
