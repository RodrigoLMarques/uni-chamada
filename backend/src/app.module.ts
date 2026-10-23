import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassSessionsModule } from './modules/class-sessions/class-sessions.module';
import { CoursesModule } from './modules/courses/courses.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'scan', limit: 10, ttl: 60000 },
        { name: 'public', limit: 60, ttl: 60000 },
        { name: 'unifesp', limit: 30, ttl: 60000 },
      ],
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    EnrollmentsModule,
    ClassSessionsModule,
    AttendanceModule,
    InstitutionsModule,
  ],
})
export class AppModule {}
