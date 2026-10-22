import { NotFoundException } from '@nestjs/common';

export class ClassSessionNotFoundException extends NotFoundException {
  constructor(sessionId: string | number) {
    super(`Class session with id ${sessionId} not found`);
  }
}
