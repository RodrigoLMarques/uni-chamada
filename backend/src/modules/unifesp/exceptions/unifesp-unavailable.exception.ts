import { ServiceUnavailableException } from '@nestjs/common';

export class UnifespUnavailableException extends ServiceUnavailableException {
  constructor(reason: string) {
    super(`unifesp_integration_failed: ${reason}`);
  }
}
