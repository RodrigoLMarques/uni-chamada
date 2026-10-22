import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthResponse } from '../src/modules/auth/models/auth.dto';
import { ClassSessionDTO } from '../src/modules/class-sessions/models/class-session.dto';
import { CourseDTO } from '../src/modules/courses/models/course.dto';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { PaginatedItems } from '../src/shared/pagination';

describe('ClassSessions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const email = `session-${stamp}@unifesp.br`;
  const otherEmail = `session-other-${stamp}@unifesp.br`;
  const password = 'secret123';
  const startsAt = '2026-11-03T13:00:00.000Z';

  let token: string;
  let otherToken: string;
  let courseId: number;
  let sessionId: number;

  const signup = async (userEmail: string) => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Teacher', email: userEmail, password })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userEmail, password })
      .expect(200);
    return (login.body as AuthResponse).accessToken;
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

    token = await signup(email);
    otherToken = await signup(otherEmail);

    const course = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: `S${stamp}`, name: 'Sessions', term: '2026.2', period: 'FULL_TIME' })
      .expect(201);
    courseId = (course.body as CourseDTO).id;
  });

  afterAll(async () => {
    await prisma.classSession.deleteMany({ where: { courseId: BigInt(courseId) } });
    await prisma.course.deleteMany({ where: { teacher: { email: { in: [email, otherEmail] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
    await app.close();
  });

  it('POST sessions schedules a session', async () => {
    const response = await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startsAt })
      .expect(201);

    const body = response.body as ClassSessionDTO;
    expect(body.status).toBe('SCHEDULED');
    expect(body.startsAt).toBe(startsAt);
    expect(body.openedAt).toBeNull();
    expect(body.latitude).toBeNull();
    sessionId = body.id;
  });

  it('POST sessions rejects the same startsAt with 409', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startsAt })
      .expect(409);
  });

  it('POST sessions rejects a non date startsAt with 400', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startsAt: 'tomorrow' })
      .expect(400);
  });

  it('POST sessions without a token returns 401', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions`)
      .send({ startsAt: '2026-12-01T13:00:00.000Z' })
      .expect(401);
  });

  it('GET sessions of another teacher course returns 404', async () => {
    await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('PATCH sessions reschedules while still scheduled', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/courses/${courseId}/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startsAt: '2026-11-04T13:00:00.000Z' })
      .expect(200);

    expect((response.body as ClassSessionDTO).startsAt).toBe('2026-11-04T13:00:00.000Z');
  });

  it('POST close before open returns 409', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/close`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  it('POST confirm before close returns 409', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  it('POST open rejects latitude without longitude with 400', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/open`)
      .set('Authorization', `Bearer ${token}`)
      .send({ latitude: -23.5505 })
      .expect(400);
  });

  it('POST open rejects an out of range latitude with 400', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/open`)
      .set('Authorization', `Bearer ${token}`)
      .send({ latitude: 120, longitude: -46.6333 })
      .expect(400);
  });

  it('POST open stores the teacher location', async () => {
    const response = await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/open`)
      .set('Authorization', `Bearer ${token}`)
      .send({ latitude: -23.5505, longitude: -46.6333, accuracyM: 12.5 })
      .expect(200);

    const body = response.body as ClassSessionDTO;
    expect(body.status).toBe('OPEN');
    expect(body.openedAt).not.toBeNull();
    expect(body.latitude).toBe(-23.5505);
    expect(body.longitude).toBe(-46.6333);
    expect(body.accuracyM).toBe(12.5);
  });

  it('POST open twice returns 409', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/open`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(409);
  });

  it('PATCH an open session returns 409', async () => {
    await request(app.getHttpServer())
      .patch(`/courses/${courseId}/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startsAt: '2026-11-05T13:00:00.000Z' })
      .expect(409);
  });

  it('DELETE an open session returns 409', async () => {
    await request(app.getHttpServer())
      .delete(`/courses/${courseId}/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  it('GET sessions filters by status', async () => {
    const openOnes = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions`)
      .query({ status: 'OPEN' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((openOnes.body as PaginatedItems<ClassSessionDTO>).pagination.totalItems).toBe(1);

    const confirmedOnes = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions`)
      .query({ status: 'CONFIRMED' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((confirmedOnes.body as PaginatedItems<ClassSessionDTO>).pagination.totalItems).toBe(0);
  });

  it('POST close stops the session', async () => {
    const response = await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/close`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as ClassSessionDTO;
    expect(body.status).toBe('CLOSED');
    expect(body.closedAt).not.toBeNull();
  });

  it('POST confirm closes the review', async () => {
    const response = await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect((response.body as ClassSessionDTO).status).toBe('CONFIRMED');
  });

  it('POST confirm twice returns 409', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions/${sessionId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  it('GET sessions/:id returns the session with its derived status', async () => {
    const response = await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect((response.body as ClassSessionDTO).status).toBe('CONFIRMED');
  });

  it('GET sessions/:id for a missing session returns 404', async () => {
    await request(app.getHttpServer())
      .get(`/courses/${courseId}/sessions/99999999`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('DELETE removes a session that never opened', async () => {
    const created = await request(app.getHttpServer())
      .post(`/courses/${courseId}/sessions`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startsAt: '2026-12-15T13:00:00.000Z' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/courses/${courseId}/sessions/${(created.body as ClassSessionDTO).id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
