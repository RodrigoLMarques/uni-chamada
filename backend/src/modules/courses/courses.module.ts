import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CourseRepository } from './repositories/course.repository';

@Module({
  controllers: [CoursesController],
  providers: [CoursesService, CourseRepository],
  exports: [CoursesService],
})
export class CoursesModule {}
