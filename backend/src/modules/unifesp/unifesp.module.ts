import { Module } from '@nestjs/common';
import { UnifespAuthService } from './unifesp-auth.service';
import { UnifespClientService } from './unifesp-client.service';

@Module({
  providers: [UnifespAuthService, UnifespClientService],
  exports: [UnifespClientService],
})
export class UnifespModule {}
