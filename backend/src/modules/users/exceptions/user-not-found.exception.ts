import { NotFoundException } from '@nestjs/common';

export class UserNotFoundException extends NotFoundException {
  constructor(userId: bigint | string) {
    super(`User with id ${userId} not found`);
  }
}
