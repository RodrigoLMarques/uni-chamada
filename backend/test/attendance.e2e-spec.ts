import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  AttendanceDTO,
  QrTokenDTO,
  ScanResponse,
} from '../src/modules/attendance/models/attendance.dto';
import { AuthResponse } from '../src/modules/auth/models/auth.dto';
import { ClassSessionDTO } from '../src/modules/class-sessions/models/class-session.dto';
import { CourseDTO } from '../src/modules/courses/models/course.dto';
import { EnrollmentDTO } from '../src/modules/enrollments/models/enrollment.dto';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { PaginatedItems } from '../src/shared/pagination';

describe('Attendance (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const email = `att-${stamp}@unifesp.br`;
  const password = 'secret123';
  const raPresent = `ATT${stamp}A`;
  const raAbsent = `ATT${stamp}B`;
  const raDropped = `ATT${stamp}C`;
  const raOutside = `ATT${stamp}D`;

  let token: string;
  let courseId: string;
  let sessionId: string;
  let presentStudentId: string;

  const qr = async () => {
    const response = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/qr`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return (response.body as QrTokenDTO).token;
  };

  const enroll = async (ra: string) => {
    const response = await request(app.getHttpServer())
      .post(`/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ra, name: `Student ${ra}` })
      .expect(201);
    return (response.body as EnrollmentDTO).student.id;
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
      .send({ code: `A${stamp}`, name: 'Attendance', term: '2026.2', period: 'FULL_TIME' })
      .expect(201);
    courseId = (course.body as CourseDTO).id;

    presentStudentId = await enroll(raPresent);
    await enroll(raAbsent);
    const droppedId = await enroll(raDropped);
    await request(app.getHttpServer())
      .patch(`/courses/${courseId}/enrollments/${droppedId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DROPPED' })
      .expect(200);

    await prisma.student.create({ data: { ra: raOutside, name: 'Outsider' } });

    const session = await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startsAt: '2026-11-25T13:00:00.000Z' })
      .expect(201);
    sessionId = (session.body as ClassSessionDTO).id;
  });

  afterAll(async () => {
    await prisma.attendance.deleteMany({ where: { classSessionId: sessionId } });
    await prisma.studentDevice.deleteMany({
      where: { student: { ra: { startsWith: `ATT${stamp}` } } },
    });
    await prisma.classSession.deleteMany({ where: { courseId } });
    await prisma.enrollment.deleteMany({ where: { courseId } });
    await prisma.student.deleteMany({ where: { ra: { startsWith: `ATT${stamp}` } } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('GET qr before opening the session returns 409', async () => {
    await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/qr`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  it('GET qr without a token returns 401', async () => {
    await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/qr`)
      .expect(401);
  });

  it('GET qr returns a rotating token once the session is open', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/open`)
      .set('Authorization', `Bearer ${token}`)
      .send({ latitude: -23.5505, longitude: -46.6333, accuracyM: 10 })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/qr`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as QrTokenDTO;
    expect(body.windowSeconds).toBe(3);
    expect(body.token.startsWith(`${sessionId}.`)).toBe(true);
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('GET scan trades the rotating token for a ticket and the session context', async () => {
    const qr = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/qr`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const { token: qrToken } = qr.body as QrTokenDTO;

    const response = await request(app.getHttpServer()).get(`/scan/${qrToken}`).expect(200);

    const body = response.body as {
      ticket: string;
      ticketExpiresAt: string;
      course: { name: string; code: string };
      teacherName: string;
      openedAt: string;
    };

    expect(body.ticket.startsWith('t.')).toBe(true);
    expect(body.course.code).toBeDefined();
    expect(body.teacherName).toBeDefined();
    expect(body.openedAt).not.toBeNull();

    const ttlMs = new Date(body.ticketExpiresAt).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(60_000);
  });

  it('GET scan refuses a token that was never signed here', async () => {
    await request(app.getHttpServer()).get(`/scan/${sessionId}.zzz.deadbeefdeadbeef`).expect(401);
  });

  it('POST scan accepts the ticket, which is what lets the student type without rushing', async () => {
    const qr = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/qr`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const context = await request(app.getHttpServer())
      .get(`/scan/${(qr.body as QrTokenDTO).token}`)
      .expect(200);

    const { ticket } = context.body as { ticket: string };

    await request(app.getHttpServer())
      .post('/scan')
      .send({ token: ticket, ra: raAbsent })
      .expect(201);

    await prisma.attendance.deleteMany({
      where: { classSessionId: sessionId, student: { ra: raAbsent } },
    });
  });

  it('POST scan rejects a garbage token with 401', async () => {
    await request(app.getHttpServer())
      .post('/scan')
      .send({ token: 'garbage.token.here', ra: raPresent })
      .expect(401);
  });

  it('POST scan rejects a token signed for another session with 401', async () => {
    const current = await qr();
    const swapped = current.replace(sessionId, 'aaaaaaaaaaaaaaaaaaaaaaaa');
    await request(app.getHttpServer())
      .post('/scan')
      .send({ token: swapped, ra: raPresent })
      .expect(401);
  });

  it('POST scan records the attendance and issues a device token', async () => {
    const current = await qr();
    const response = await request(app.getHttpServer())
      .post('/scan')
      .send({
        token: current,
        ra: raPresent,
        latitude: -23.5506,
        longitude: -46.6334,
        accuracyM: 15,
      })
      .expect(201);

    const body = response.body as ScanResponse;
    expect(body.status).toBe('RECORDED');
    expect(body.studentName).toBe(`Student ${raPresent}`);
    expect(body.deviceToken).toEqual(expect.any(String));

    const stored = await prisma.attendance.findUnique({
      where: {
        classSessionId_studentId: { classSessionId: sessionId, studentId: presentStudentId },
      },
    });
    expect(stored?.method).toBe('QR');
    expect(stored?.deviceId).not.toBeNull();
    expect(stored?.clientIp).not.toBeNull();
  });

  it('POST scan twice for the same student returns 409', async () => {
    const current = await qr();
    await request(app.getHttpServer())
      .post('/scan')
      .send({ token: current, ra: raPresent })
      .expect(409);
  });

  it('POST scan with a dropped enrollment returns 403', async () => {
    const current = await qr();
    await request(app.getHttpServer())
      .post('/scan')
      .send({ token: current, ra: raDropped })
      .expect(403);
  });

  it('POST scan with an ra from outside the course returns 403', async () => {
    const current = await qr();
    await request(app.getHttpServer())
      .post('/scan')
      .send({ token: current, ra: raOutside })
      .expect(403);
  });

  it('POST scan with an unknown ra returns the same 403, not a 404', async () => {
    const current = await qr();
    await request(app.getHttpServer())
      .post('/scan')
      .send({ token: current, ra: 'DOES-NOT-EXIST' })
      .expect(403);
  });

  it('the device row stores only the hash of the token', async () => {
    const stored = await prisma.attendance.findFirst({
      where: { classSessionId: sessionId, studentId: presentStudentId },
    });
    const deviceId = stored?.deviceId;

    const device = await prisma.studentDevice.findUnique({ where: { id: deviceId as string } });
    expect(device?.studentId).toBe(presentStudentId);
    expect(device?.tokenHash).toHaveLength(64);
  });

  it('GET attendance lists the roll with derived flags', async () => {
    const response = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/attendance`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as PaginatedItems<AttendanceDTO>;
    expect(body.pagination.totalItems).toBe(1);

    const row = body.data[0];
    expect(row.student.ra).toBe(raPresent);
    expect(row.method).toBe('QR');
    expect(row.distanceM).toBeLessThan(100);
    expect(row.flags).toEqual({ noLocation: false, farFromTeacher: false, sharedDevice: false });
  });

  it('POST attendance for an already present student returns 409', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/attendance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ra: raPresent })
      .expect(409);
  });

  it('POST attendance adds one manual entry, and DELETE takes it back', async () => {
    const created = await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/attendance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ra: raAbsent })
      .expect(201);

    const body = created.body as AttendanceDTO;
    expect(body.method).toBe('MANUAL');
    expect(body.flags).toEqual({ noLocation: false, farFromTeacher: false, sharedDevice: false });
    expect(body.distanceM).toBeNull();

    await request(app.getHttpServer())
      .delete(`/courses/${courseId}/sessions/${sessionId}/attendance/${body.student.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const roll = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/roll`)
      .query({ status: 'ABSENT' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const absent = (roll.body as { data: { student: { ra: string } }[] }).data;
    expect(absent.map((row) => row.student.ra)).toContain(raAbsent);
  });

  it('GET roll lists every enrolled student, present and absent', async () => {
    const response = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/roll`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as {
      data: { student: { ra: string }; status: string }[];
      summary: { enrolled: number; present: number; absent: number };
    };

    expect(body.summary).toEqual({ enrolled: 2, present: 1, absent: 1 });

    const byRa = new Map(body.data.map((row) => [row.student.ra, row.status]));
    expect(byRa.get(raPresent)).toBe('PRESENT');
    expect(byRa.get(raAbsent)).toBe('ABSENT');
    expect(byRa.has(raDropped)).toBe(false);
  });

  it('GET roll filters by ABSENT so the teacher sees who to mark', async () => {
    const response = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/roll`)
      .query({ status: 'ABSENT' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as { data: { student: { ra: string } }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].student.ra).toBe(raAbsent);
  });

  it('GET roll carries the attendance detail on present rows', async () => {
    const response = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/roll`)
      .query({ status: 'PRESENT' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const row = (
      response.body as {
        data: { method: string; distanceM: number; flags: Record<string, boolean> }[];
      }
    ).data[0];
    expect(row.method).toBe('QR');
    expect(row.distanceM).toBeLessThan(100);
    expect(row.flags.farFromTeacher).toBe(false);
  });

  it('GET roll of another teacher session returns 404', async () => {
    const otherEmail = `att-other-${stamp}@unifesp.br`;
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Other', email: otherEmail, password })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: otherEmail, password })
      .expect(200);
    const otherToken = (login.body as AuthResponse).accessToken;

    await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/roll`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await prisma.user.deleteMany({ where: { email: otherEmail } });
  });

  it('POST attendance/bulk reports what it recorded and what it skipped', async () => {
    const response = await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/attendance/bulk`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ras: [raAbsent, raPresent, raDropped, 'TYPO-RA'] })
      .expect(200);

    const body = response.body as {
      recorded: string[];
      skipped: { ra: string; reason: string }[];
    };

    expect(body.recorded).toEqual([raAbsent]);
    expect(body.skipped).toEqual(
      expect.arrayContaining([
        { ra: raPresent, reason: 'ALREADY_REGISTERED' },
        { ra: raDropped, reason: 'NOT_ENROLLED' },
        { ra: 'TYPO-RA', reason: 'NOT_ENROLLED' },
      ]),
    );

    const stored = await prisma.attendance.findMany({ where: { classSessionId: sessionId } });
    expect(stored).toHaveLength(2);
    expect(stored.filter((row) => row.method === 'MANUAL')).toHaveLength(1);
  });

  it('POST attendance/bulk rejects an empty list with 400', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/attendance/bulk`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ras: [] })
      .expect(400);
  });

  it('the roll closes at full attendance after the bulk entry', async () => {
    const response = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}/roll`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect((response.body as { summary: { present: number; absent: number } }).summary).toEqual({
      enrolled: 2,
      present: 2,
      absent: 0,
    });
  });

  it('POST scan after closing the session returns 409', async () => {
    const current = await qr();

    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/close`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/scan')
      .send({ token: current, ra: raAbsent })
      .expect(409);
  });

  it('manual entry is blocked once the session is confirmed', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/attendance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ra: raAbsent })
      .expect(409);
  });
});
