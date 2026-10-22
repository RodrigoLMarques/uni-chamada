import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthResponse, UserPayload } from '../src/modules/auth/models/auth.dto';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const email = `auth-${Date.now()}@unifesp.br`;
  const password = 'secret123';

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
      .send({ name: 'Auth E2E', email, password })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  let accessToken: string;

  it('POST /auth/login returns a token and the user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const body = response.body as AuthResponse;
    expect(typeof body.accessToken).toBe('string');
    expect(Object.keys(body.user).sort()).toEqual(['email', 'id', 'name']);
    expect(body.user.id).toMatch(/^[a-z0-9]{24}$/);
    expect(body.user).toMatchObject({ name: 'Auth E2E', email });

    accessToken = body.accessToken;
  });

  it('POST /auth/login with a wrong password returns 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong' })
      .expect(401);
  });

  it('POST /auth/login with an unknown email returns 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nobody@unifesp.br', password })
      .expect(401);
  });

  it('GET /auth/me returns the user from the token', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((response.body as UserPayload).email).toBe(email);
  });

  it('GET /auth/me without a token returns 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me with an invalid token returns 401', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-token')
      .expect(401);
  });

  it('PUT /auth/password changes the password and the new login works', async () => {
    await request(app.getHttpServer())
      .put('/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword: 'newsecret123' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'newsecret123' })
      .expect(200);

    await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(401);
  });

  it('PUT /auth/password with a wrong current password returns 401', async () => {
    await request(app.getHttpServer())
      .put('/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'wrong', newPassword: 'othersecret123' })
      .expect(401);
  });
});
