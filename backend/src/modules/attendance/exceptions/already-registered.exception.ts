import { ConflictException } from '@nestjs/common';

export class AlreadyRegisteredException extends ConflictException {
  constructor() {
    super('attendance_already_registered');
  }
}
