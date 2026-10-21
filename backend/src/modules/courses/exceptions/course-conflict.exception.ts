import { ConflictException } from '@nestjs/common';

export class CourseConflictException extends ConflictException {
  constructor() {
    super('course_already_exists');
  }
}
