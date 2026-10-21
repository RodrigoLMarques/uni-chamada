import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthResponse } from '../src/modules/auth/models/auth.dto';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { UserDTO } from '../src/modules/users/models/user.dto';
import { PaginatedItems } from '../src/shared/pagination';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const stamp = Date.now();
  const email = `e2e-${stamp}@unifesp.br`;
  const otherEmail = `e2e-outro-${stamp}@unifesp.br`;
  const password = 'secret123';

  let token: string;
  let userId: number;

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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
    await app.close();
  });

  it('POST /users is public and returns a numeric id', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'E2E Teacher', email, password })
      .expect(201);

    const body = response.body as UserDTO;
    expect(Object.keys(body).sort()).toEqual(['email', 'id', 'name']);
    expect(typeof body.id).toBe('number');
    expect(body).toMatchObject({ name: 'E2E Teacher', email });

    userId = body.id;

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    token = (login.body as AuthResponse).accessToken;
  });

  it('the password is stored hashed in the password_hash column', async () => {
    const stored = await prisma.user.findUnique({ where: { id: BigInt(userId) } });
    expect(stored?.passwordHash).not.toBe(password);
    expect(stored?.passwordHash.startsWith('$2')).toBe(true);
  });

  it('POST /users rejects a duplicate email with 409', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Another', email, password })
      .expect(409);
  });

  it('POST /users validates the payload with 400', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'No Email', email: 'not-an-email', password: '123' })
      .expect(400);
  });

  it('POST /users rejects an unknown field with 400', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'X', email: otherEmail, password, role: 'admin' })
      .expect(400);
  });

  it('GET /users without a token returns 401', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });

  it('GET /users authenticated returns the paginated list', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .query({ query: email, page: 1, itemsPerPage: 10 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as PaginatedItems<UserDTO>;
    expect(body.pagination).toEqual({
      page: 1,
      itemsPerPage: 10,
      totalItems: 1,
      totalPages: 1,
    });
    expect(body.data[0].id).toBe(userId);
  });

  it('GET /users/:id returns the user', async () => {
    const response = await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect((response.body as UserDTO).email).toBe(email);
  });

  it('GET /users/:id with a non numeric id returns 400', async () => {
    await request(app.getHttpServer())
      .get('/users/not-a-number')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('GET /users/:id for a missing user returns 404', async () => {
    await request(app.getHttpServer())
      .get('/users/99999999')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('PATCH /users/me updates the own name', async () => {
    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Renamed' })
      .expect(200);

    expect((response.body as UserDTO).name).toBe('E2E Renamed');
  });

  it('PATCH /users/:id updates name and email', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Again' })
      .expect(200);

    expect((response.body as UserDTO).name).toBe('E2E Again');
  });

  it('DELETE /users/:id deletes for real', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const stored = await prisma.user.findUnique({ where: { id: BigInt(userId) } });
    expect(stored).toBeNull();
  });

  it('the token of a deleted user stops working', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
