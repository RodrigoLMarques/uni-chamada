import { ConflictException } from '@nestjs/common';
import { ClassSessionStatus } from '../models/class-session.entity';

export class ClassSessionStateException extends ConflictException {
  constructor(action: string, status: ClassSessionStatus) {
    super(`cannot_${action}_a_${status.toLowerCase()}_class_session`);
  }
}
