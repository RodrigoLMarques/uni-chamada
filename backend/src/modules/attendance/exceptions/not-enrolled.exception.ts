import { ForbiddenException } from '@nestjs/common';

export class NotEnrolledException extends ForbiddenException {
  constructor() {
    super('ra_not_enrolled_in_this_class');
  }
}
