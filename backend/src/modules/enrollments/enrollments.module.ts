import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentRepository } from './repositories/enrollment.repository';

@Module({
  imports: [CoursesModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService, EnrollmentRepository],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
