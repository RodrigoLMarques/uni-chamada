import { UnauthorizedException } from '@nestjs/common';

export class InvalidQrTokenException extends UnauthorizedException {
  constructor() {
    super('invalid_or_expired_qr_token');
  }
}
