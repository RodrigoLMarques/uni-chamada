import { NotFoundException } from '@nestjs/common';

export class StudentNotFoundException extends NotFoundException {
  constructor(ra: string) {
    super(`No active enrollment found for ra ${ra}`);
  }
}
