import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  CourseReportDTO,
  LiveSessionDTO,
  QrTokenDTO,
  StudentAttendanceDTO,
  StudentSessionDTO,
} from '../src/modules/attendance/models/attendance.dto';
import { AuthResponse } from '../src/modules/auth/models/auth.dto';
import { ClassSessionDTO } from '../src/modules/class-sessions/models/class-session.dto';
import { CourseDTO } from '../src/modules/courses/models/course.dto';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { PaginatedItems } from '../src/shared/pagination';

describe('Attendance report (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const email = `rep-${stamp}@unifesp.br`;
  const password = 'secret123';
  const raPresent = `REP${stamp}A`;
  const raAbsent = `REP${stamp}B`;

  let token: string;
  let courseId: string;

  const openSession = async (startsAt: string, course = courseId) => {
    const created = await request(app.getHttpServer())
      .post(`/courses/${course}/sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startsAt })
      .expect(201);
    const id = (created.body as ClassSessionDTO).id;

    await request(app.getHttpServer())
      .post(`/courses/${course}/sessions/${id}/open`)
      .set('Authorization', `Bearer ${token}`)
      .send({ latitude: -23.5505, longitude: -46.6333 })
      .expect(200);

    return id;
  };

  const scan = async (sessionId: string, ra: string, course = courseId) => {
    const qr = await request(app.getHttpServer())
      .get(`/courses/${course}/sessions/${sessionId}/qr`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const qrToken = (qr.body as QrTokenDTO).token;

    await request(app.getHttpServer()).post('/scan').send({ token: qrToken, ra }).expect(201);
  };

  const closeAndConfirm = async (sessionId: string, course = courseId) => {
    await request(app.getHttpServer())
      .post(`/courses/${course}/sessions/${sessionId}/close`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer())
      .post(`/courses/${course}/sessions/${sessionId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, forbidNonWhitelisted: true, whitelist: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Teacher', email, password })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    token = (login.body as AuthResponse).accessToken;

    const course = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: `R${stamp}`, name: 'Report', term: '2026.2', period: 'FULL_TIME' })
      .expect(201);
    courseId = (course.body as CourseDTO).id;

    for (const ra of [raPresent, raAbsent]) {
      await request(app.getHttpServer())
        .post(`/courses/${courseId}/enrollments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ra, name: `Student ${ra}` })
        .expect(201);
    }
  });

  afterAll(async () => {
    await prisma.attendance.deleteMany({
      where: { classSession: { course: { teacher: { email } } } },
    });
    await prisma.studentDevice.deleteMany({
      where: { student: { ra: { startsWith: `REP${stamp}` } } },
    });
    await prisma.classSession.deleteMany({ where: { course: { teacher: { email } } } });
    await prisma.enrollment.deleteMany({ where: { course: { teacher: { email } } } });
    await prisma.student.deleteMany({ where: { ra: { startsWith: `REP${stamp}` } } });
    await prisma.course.deleteMany({ where: { teacher: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  describe('GET live, for the 3s polling of the projection screen', () => {
    let sessionId: string;

    beforeAll(async () => {
      sessionId = await openSession('2026-12-01T13:00:00.000Z');
    });

    it('returns the qr, the counters and an empty recent list', async () => {
      const response = await request(app.getHttpServer())
        .get(`/courses/${courseId}/sessions/${sessionId}/live`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as LiveSessionDTO;
      expect(body.status).toBe('OPEN');
      expect(body.qr?.windowSeconds).toBe(3);
      expect(body.summary).toEqual({ enrolled: 2, present: 0, absent: 2 });
      expect(body.lastRecordedAt).toBeNull();
      expect(body.recent).toEqual([]);
    });

    it('moves the counters and lists who just scanned', async () => {
      await scan(sessionId, raPresent);

      const response = await request(app.getHttpServer())
        .get(`/courses/${courseId}/sessions/${sessionId}/live`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as LiveSessionDTO;
      expect(body.summary).toEqual({ enrolled: 2, present: 1, absent: 1 });
      expect(body.lastRecordedAt).not.toBeNull();
      expect(body.recent).toHaveLength(1);
      expect(body.recent[0]).toMatchObject({ ra: raPresent, method: 'QR' });
    });

    it('drops the qr once the session closes, keeping the counters', async () => {
      await request(app.getHttpServer())
        .post(`/courses/${courseId}/sessions/${sessionId}/close`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/courses/${courseId}/sessions/${sessionId}/live`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as LiveSessionDTO;
      expect(body.status).toBe('CLOSED');
      expect(body.qr).toBeNull();
      expect(body.summary.present).toBe(1);
    });

    it('needs a token', async () => {
      await request(app.getHttpServer())
        .get(`/courses/${courseId}/sessions/${sessionId}/live`)
        .expect(401);
    });
  });

  describe('GET report, the semester overview', () => {
    let reportCourse: string;

    beforeAll(async () => {
      const course = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: `O${stamp}`, name: 'Overview', term: '2026.2', period: 'FULL_TIME' })
        .expect(201);
      reportCourse = (course.body as CourseDTO).id;

      for (const ra of [raPresent, raAbsent]) {
        await request(app.getHttpServer())
          .post(`/courses/${reportCourse}/enrollments`)
          .set('Authorization', `Bearer ${token}`)
          .send({ ra, name: `Student ${ra}` })
          .expect(201);
      }
    });

    it('reports null rate while no session was confirmed yet', async () => {
      const response = await request(app.getHttpServer())
        .get(`/courses/${reportCourse}/report`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as CourseReportDTO;
      expect(body.summary).toEqual({ students: 2, confirmedSessions: 0, pendingSessions: 0 });
      expect(body.data.every((row) => row.attendanceRate === null)).toBe(true);
    });

    it('counts only confirmed sessions in the denominator', async () => {
      const first = await openSession('2027-01-10T13:00:00.000Z', reportCourse);
      await scan(first, raPresent, reportCourse);
      await scan(first, raAbsent, reportCourse);
      await closeAndConfirm(first, reportCourse);

      const second = await openSession('2027-01-11T13:00:00.000Z', reportCourse);
      await scan(second, raPresent, reportCourse);
      await closeAndConfirm(second, reportCourse);

      const pending = await openSession('2027-01-12T13:00:00.000Z', reportCourse);
      await scan(pending, raAbsent, reportCourse);
      await request(app.getHttpServer())
        .post(`/courses/${reportCourse}/sessions/${pending}/close`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/courses/${reportCourse}/report`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as CourseReportDTO;
      expect(body.summary).toEqual({ students: 2, confirmedSessions: 2, pendingSessions: 1 });

      const byRa = new Map(body.data.map((row) => [row.student.ra, row]));
      expect(byRa.get(raPresent)).toMatchObject({ attendedSessions: 2, attendanceRate: 1 });
      expect(byRa.get(raAbsent)).toMatchObject({ attendedSessions: 1, attendanceRate: 0.5 });
    });

    it('filters by name or ra', async () => {
      const response = await request(app.getHttpServer())
        .get(`/courses/${reportCourse}/report`)
        .query({ query: raAbsent })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as CourseReportDTO;
      expect(body.data).toHaveLength(1);
      expect(body.data[0].student.ra).toBe(raAbsent);
    });

    it('leaves a dropped enrollment out of the report', async () => {
      const students = await request(app.getHttpServer())
        .get(`/courses/${reportCourse}/report`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const target = (students.body as CourseReportDTO).data.find(
        (row) => row.student.ra === raAbsent,
      );

      await request(app.getHttpServer())
        .patch(`/courses/${reportCourse}/enrollments/${target?.student.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'DROPPED' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/courses/${reportCourse}/report`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as CourseReportDTO;
      expect(body.summary.students).toBe(1);
      expect(body.data.map((row) => row.student.ra)).not.toContain(raAbsent);
    });

    it('needs a token', async () => {
      await request(app.getHttpServer()).get(`/courses/${reportCourse}/report`).expect(401);
    });

    it('returns 404 for a course of another teacher', async () => {
      const otherEmail = `rep-other-${stamp}@unifesp.br`;
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Other', email: otherEmail, password })
        .expect(201);
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: otherEmail, password })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/courses/${reportCourse}/report`)
        .set('Authorization', `Bearer ${(login.body as AuthResponse).accessToken}`)
        .expect(404);

      await prisma.user.deleteMany({ where: { email: otherEmail } });
    });
  });

  describe('public student lookup', () => {
    let reportCourseId: string;

    const courseOf = (body: StudentAttendanceDTO) =>
      body.courses.find((row) => row.course.id === reportCourseId);

    beforeAll(async () => {
      const course = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: `P${stamp}`, name: 'Public', term: '2026.2', period: 'EVENING' })
        .expect(201);
      reportCourseId = (course.body as CourseDTO).id;

      for (const ra of [raPresent, raAbsent]) {
        await request(app.getHttpServer())
          .post(`/courses/${reportCourseId}/enrollments`)
          .set('Authorization', `Bearer ${token}`)
          .send({ ra, name: `Student ${ra}` })
          .expect(201);
      }

      const first = await openSession('2026-12-02T13:00:00.000Z', reportCourseId);
      await scan(first, raPresent, reportCourseId);
      await closeAndConfirm(first, reportCourseId);

      const second = await openSession('2026-12-03T13:00:00.000Z', reportCourseId);
      await scan(second, raPresent, reportCourseId);
      await scan(second, raAbsent, reportCourseId);
      await closeAndConfirm(second, reportCourseId);

      const pending = await openSession('2026-12-04T13:00:00.000Z', reportCourseId);
      await request(app.getHttpServer())
        .post(`/courses/${reportCourseId}/sessions/${pending}/close`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('needs no token and reports the rate over confirmed sessions only', async () => {
      const response = await request(app.getHttpServer())
        .get(`/students/${raPresent}/attendance`)
        .expect(200);

      const body = response.body as StudentAttendanceDTO;
      expect(body.student.ra).toBe(raPresent);

      const course = courseOf(body);
      expect(course?.confirmedSessions).toBe(2);
      expect(course?.attendedSessions).toBe(2);
      expect(course?.attendanceRate).toBe(1);
      expect(course?.pendingSessions).toBe(1);
    });

    it('reports a partial rate for who missed a class', async () => {
      const response = await request(app.getHttpServer())
        .get(`/students/${raAbsent}/attendance`)
        .expect(200);

      const course = courseOf(response.body as StudentAttendanceDTO);
      expect(course?.attendedSessions).toBe(1);
      expect(course?.confirmedSessions).toBe(2);
      expect(course?.attendanceRate).toBe(0.5);
    });

    it('lists the confirmed sessions one by one', async () => {
      const response = await request(app.getHttpServer())
        .get(`/students/${raAbsent}/courses/${reportCourseId}/attendance`)
        .expect(200);

      const body = response.body as PaginatedItems<StudentSessionDTO>;
      expect(body.pagination.totalItems).toBe(2);
      expect(body.data.map((row) => row.status).sort()).toEqual(['ABSENT', 'PRESENT']);
    });

    it('hides sessions still waiting for the teacher review', async () => {
      const response = await request(app.getHttpServer())
        .get(`/students/${raPresent}/courses/${reportCourseId}/attendance`)
        .expect(200);

      const body = response.body as PaginatedItems<StudentSessionDTO>;
      expect(body.data.every((row) => row.status === 'PRESENT')).toBe(true);
      expect(body.pagination.totalItems).toBe(2);
    });

    it('returns 404 for an unknown ra', async () => {
      await request(app.getHttpServer()).get('/students/NOPE-RA/attendance').expect(404);
    });

    it('returns 404 for an ra not enrolled in that course', async () => {
      await request(app.getHttpServer())
        .get(`/students/NOPE-RA/courses/${reportCourseId}/attendance`)
        .expect(404);
    });
  });
});
