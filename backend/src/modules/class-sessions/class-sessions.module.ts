import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { ClassSessionsController } from './class-sessions.controller';
import { ClassSessionsService } from './class-sessions.service';
import { ClassSessionRepository } from './repositories/class-session.repository';

@Module({
  imports: [CoursesModule],
  controllers: [ClassSessionsController],
  providers: [ClassSessionsService, ClassSessionRepository],
  exports: [ClassSessionsService],
})
export class ClassSessionsModule {}
