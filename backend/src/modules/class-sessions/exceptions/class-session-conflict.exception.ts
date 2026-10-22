import { ConflictException } from '@nestjs/common';

export class ClassSessionConflictException extends ConflictException {
  constructor() {
    super('class_session_already_scheduled_at_this_time');
  }
}
