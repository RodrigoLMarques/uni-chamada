import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PhotoPresignInterceptor } from './photo-presign.interceptor';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [StorageService, { provide: APP_INTERCEPTOR, useClass: PhotoPresignInterceptor }],
  exports: [StorageService],
})
export class StorageModule {}
