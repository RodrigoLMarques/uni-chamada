import { ConflictException } from '@nestjs/common';

export class SessionNotOpenException extends ConflictException {
  constructor() {
    super('class_session_is_not_open');
  }
}
