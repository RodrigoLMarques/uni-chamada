import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthResponse } from '../src/modules/auth/models/auth.dto';
import { CourseDTO } from '../src/modules/courses/models/course.dto';
import { EnrollmentDTO } from '../src/modules/enrollments/models/enrollment.dto';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { PaginatedItems } from '../src/shared/pagination';

describe('Courses and enrollments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const email = `teacher-${stamp}@unifesp.br`;
  const otherEmail = `teacher-other-${stamp}@unifesp.br`;
  const password = 'secret123';
  const ra = `RA${stamp}`;

  let token: string;
  let otherToken: string;
  let courseId: string;
  let studentId: string;

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
  });

  afterAll(async () => {
    await prisma.enrollment.deleteMany({ where: { course: { teacher: { email } } } });
    await prisma.course.deleteMany({
      where: { teacher: { email: { in: [email, otherEmail] } } },
    });
    await prisma.student.deleteMany({ where: { ra: { startsWith: `RA${stamp}` } } });
    await prisma.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
    await app.close();
  });

  it('POST /courses creates the course', async () => {
    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'BCM0504', name: 'DSA', term: '2026.2', period: 'FULL_TIME' })
      .expect(201);

    const body = response.body as CourseDTO;
    expect(body).toMatchObject({ code: 'BCM0504', term: '2026.2', period: 'FULL_TIME' });
    courseId = body.id;
  });

  it('POST /courses rejects the same key with 409', async () => {
    await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'BCM0504', name: 'DSA', term: '2026.2', period: 'FULL_TIME' })
      .expect(409);
  });

  it('POST /courses accepts the same code in a different period', async () => {
    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'BCM0504', name: 'DSA', term: '2026.2', period: 'EVENING' })
      .expect(201);

    expect((response.body as CourseDTO).period).toBe('EVENING');
  });

  it('POST /courses rejects an invalid period with 400', async () => {
    await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'X', name: 'X', term: '2026.2', period: 'MATUTINO' })
      .expect(400);
  });

  it('GET /courses without a token returns 401', async () => {
    await request(app.getHttpServer()).get('/courses').expect(401);
  });

  it('GET /courses lists only the signed in teacher courses', async () => {
    const mine = await request(app.getHttpServer())
      .get('/courses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((mine.body as PaginatedItems<CourseDTO>).pagination.totalItems).toBe(2);

    const others = await request(app.getHttpServer())
      .get('/courses')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    expect((others.body as PaginatedItems<CourseDTO>).pagination.totalItems).toBe(0);
  });

  it('GET /courses/:id of another teacher returns 404', async () => {
    await request(app.getHttpServer())
      .get(`/courses/${courseId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('POST enrollments enrolls the student by ra', async () => {
    const response = await request(app.getHttpServer())
      .post(`/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ra,
        name: 'Test Student',
        email: `student-${stamp}@unifesp.br`,
        photoUrl: 'https://example.com/photo.jpg',
        entryYear: 2024,
      })
      .expect(201);

    const body = response.body as EnrollmentDTO;
    expect(body.status).toBe('ACTIVE');
    expect(body.student).toMatchObject({
      ra,
      name: 'Test Student',
      email: `student-${stamp}@unifesp.br`,
      photoUrl: 'https://example.com/photo.jpg',
      entryYear: 2024,
    });
    studentId = body.student.id;
  });

  it('POST enrollments rejects an invalid email with 400', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ra: `${ra}BAD`, name: 'Bad Email', email: 'not-an-email' })
      .expect(400);
  });

  it('POST enrollments rejects an invalid photoUrl with 400', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ra: `${ra}BAD`, name: 'Bad Url', photoUrl: 'not-a-url' })
      .expect(400);
  });

  it('POST enrollments rejects an out of range entryYear with 400', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ra: `${ra}BAD`, name: 'Bad Year', entryYear: 1800 })
      .expect(400);
  });

  it('POST enrollments rejects the same student twice with 409', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ra, name: 'Test Student' })
      .expect(409);
  });

  it('the same ra in another course reuses the student', async () => {
    const other = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'BCM0505', name: 'Another', term: '2026.2', period: 'FULL_TIME' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/courses/${(other.body as CourseDTO).id}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ra, name: 'Different Name' })
      .expect(201);

    const body = response.body as EnrollmentDTO;
    expect(body.student.id).toBe(studentId);
    expect(body.student.name).toBe('Test Student');
    expect(body.student.entryYear).toBe(2024);
  });

  it('a second enrollment fills only the fields still missing on the student', async () => {
    const bare = `${ra}BARE`;

    const createCourse = async (code: string) => {
      const response = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${token}`)
        .send({ code, name: code, term: '2026.2', period: 'FULL_TIME' })
        .expect(201);
      return (response.body as CourseDTO).id;
    };

    const courseA = await createCourse('BCM0506');
    const courseB = await createCourse('BCM0507');

    const first = await request(app.getHttpServer())
      .post(`/courses/${courseA}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ra: bare, name: 'Bare Student' })
      .expect(201);
    expect((first.body as EnrollmentDTO).student.entryYear).toBeNull();

    const second = await request(app.getHttpServer())
      .post(`/courses/${courseB}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ra: bare, name: 'Ignored Name', entryYear: 2023 })
      .expect(201);

    const body = second.body as EnrollmentDTO;
    expect(body.student.entryYear).toBe(2023);
    expect(body.student.name).toBe('Bare Student');
  });

  it('POST enrollments into another teacher course returns 404', async () => {
    await request(app.getHttpServer())
      .post(`/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ ra: `${ra}X`, name: 'Intruder' })
      .expect(404);
  });

  it('GET enrollments returns the enrolled students', async () => {
    const response = await request(app.getHttpServer())
      .get(`/courses/${courseId}/enrollments`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as PaginatedItems<EnrollmentDTO>;
    expect(body.pagination.totalItems).toBe(1);
    expect(body.data[0].student.ra).toBe(ra);
  });

  it('PATCH enrollments drops by status without deleting', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/courses/${courseId}/enrollments/${studentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DROPPED' })
      .expect(200);

    expect((response.body as EnrollmentDTO).status).toBe('DROPPED');

    const still = await prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
    });
    expect(still).not.toBeNull();
  });

  it('GET enrollments filters by status', async () => {
    const response = await request(app.getHttpServer())
      .get(`/courses/${courseId}/enrollments`)
      .query({ status: 'ACTIVE' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect((response.body as PaginatedItems<EnrollmentDTO>).pagination.totalItems).toBe(0);
  });

  it('PATCH enrollments updates the student data', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/courses/${courseId}/enrollments/${studentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Fixed Name',
        email: `fixed-${stamp}@unifesp.br`,
        photoUrl: 'https://example.com/fixed.jpg',
        entryYear: 2022,
      })
      .expect(200);

    const body = response.body as EnrollmentDTO;
    expect(body.student).toMatchObject({
      name: 'Fixed Name',
      email: `fixed-${stamp}@unifesp.br`,
      photoUrl: 'https://example.com/fixed.jpg',
      entryYear: 2022,
    });
  });

  it('PATCH enrollments overwrites a value that was already filled', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/courses/${courseId}/enrollments/${studentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ entryYear: 2021 })
      .expect(200);

    expect((response.body as EnrollmentDTO).student.entryYear).toBe(2021);
  });

  it('PATCH enrollments clears an optional field with null', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/courses/${courseId}/enrollments/${studentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: null })
      .expect(200);

    expect((response.body as EnrollmentDTO).student.email).toBeNull();
  });

  it('PATCH enrollments updates data and status together', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/courses/${courseId}/enrollments/${studentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Back Again', status: 'ACTIVE' })
      .expect(200);

    const body = response.body as EnrollmentDTO;
    expect(body.student.name).toBe('Back Again');
    expect(body.status).toBe('ACTIVE');
  });

  it('PATCH enrollments rejects an invalid email with 400', async () => {
    await request(app.getHttpServer())
      .patch(`/courses/${courseId}/enrollments/${studentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('PATCH enrollments rejects changing the ra with 400', async () => {
    await request(app.getHttpServer())
      .patch(`/courses/${courseId}/enrollments/${studentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ra: 'OTHER-RA' })
      .expect(400);
  });

  it('DELETE enrollments removes the enrollment but keeps the student', async () => {
    await request(app.getHttpServer())
      .delete(`/courses/${courseId}/enrollments/${studentId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    expect(student).not.toBeNull();
  });

  it('DELETE /courses/:id deletes the course and its enrollments', async () => {
    await request(app.getHttpServer())
      .delete(`/courses/${courseId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/courses/${courseId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
