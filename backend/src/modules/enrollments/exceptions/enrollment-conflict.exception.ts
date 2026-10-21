import { ConflictException } from '@nestjs/common';

export class EnrollmentConflictException extends ConflictException {
  constructor(ra: string) {
    super(`student_${ra}_already_enrolled`);
  }
}
