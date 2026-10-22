import { NotFoundException } from '@nestjs/common';

export class CourseNotFoundException extends NotFoundException {
  constructor(courseId: string | number) {
    super(`Course with id ${courseId} not found`);
  }
}
