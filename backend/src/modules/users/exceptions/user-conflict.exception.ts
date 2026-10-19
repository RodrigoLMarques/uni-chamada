import { ConflictException } from '@nestjs/common';

export class UserConflictException extends ConflictException {
  constructor(field: 'email') {
    super(`${field}_already_in_use`);
  }
}
