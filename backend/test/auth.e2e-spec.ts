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
  const password = 'segredo123';

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

  it('POST /auth/login devolve token e usuário', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const body = response.body as AuthResponse;
    expect(typeof body.accessToken).toBe('string');
    expect(Object.keys(body.user).sort()).toEqual(['email', 'id', 'name']);
    expect(typeof body.user.id).toBe('number');
    expect(body.user).toMatchObject({ name: 'Auth E2E', email });

    accessToken = body.accessToken;
  });

  it('POST /auth/login com senha errada dá 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'errada' })
      .expect(401);
  });

  it('POST /auth/login com email inexistente dá 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ninguem@unifesp.br', password })
      .expect(401);
  });

  it('GET /auth/me devolve o usuário do token', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((response.body as UserPayload).email).toBe(email);
  });

  it('GET /auth/me sem token dá 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /auth/me com token inválido dá 401', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer nao-e-um-token')
      .expect(401);
  });

  it('PUT /auth/password troca a senha e o login novo funciona', async () => {
    await request(app.getHttpServer())
      .put('/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword: 'novasenha123' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'novasenha123' })
      .expect(200);

    await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(401);
  });

  it('PUT /auth/password com a senha atual errada dá 401', async () => {
    await request(app.getHttpServer())
      .put('/auth/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'errada', newPassword: 'outrasenha123' })
      .expect(401);
  });
});
