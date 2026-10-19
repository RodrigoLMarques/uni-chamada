import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { UserDTO } from '../src/modules/users/models/user.dto';
import { PaginatedItems } from '../src/shared/pagination';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const email = `e2e-${Date.now()}@unifesp.br`;
  const otherEmail = `e2e-outro-${Date.now()}@unifesp.br`;

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

  let userId: string;

  it('POST /users cria o usuário e nunca devolve a senha', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'E2E Aluno', email, password: 'segredo123' })
      .expect(201);

    const body = response.body as UserDTO;
    expect(Object.keys(body).sort()).toEqual(['email', 'id', 'name', 'role']);
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body).toMatchObject({ name: 'E2E Aluno', email, role: 'student' });

    userId = body.id;
  });

  it('a senha fica hasheada no banco', async () => {
    const stored = await prisma.user.findUnique({ where: { id: userId } });
    expect(stored?.password).not.toBe('segredo123');
    expect(stored?.password.startsWith('$2')).toBe(true);
  });

  it('POST /users recusa email duplicado com 409', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Outro', email, password: 'segredo123' })
      .expect(409);
  });

  it('POST /users valida o payload com 400', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Sem Email', email: 'nao-e-email', password: '123' })
      .expect(400);
  });

  it('POST /users rejeita campo desconhecido com 400', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'X', email: otherEmail, password: 'segredo123', admin: true })
      .expect(400);
  });

  it('GET /users/:id devolve o usuário', async () => {
    const response = await request(app.getHttpServer()).get(`/users/${userId}`).expect(200);
    expect((response.body as UserDTO).email).toBe(email);
  });

  it('GET /users/:id com uuid inválido dá 400', async () => {
    await request(app.getHttpServer()).get('/users/nao-e-uuid').expect(400);
  });

  it('GET /users paginado inclui o usuário criado', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .query({ query: email, page: 1, itemsPerPage: 10 })
      .expect(200);

    const body = response.body as PaginatedItems<UserDTO>;
    expect(body.pagination).toEqual({
      page: 1,
      itemsPerPage: 10,
      totalItems: 1,
      totalPages: 1,
    });
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(userId);
  });

  it('GET /users filtra por role', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .query({ query: email, role: 'professor' })
      .expect(200);

    expect((response.body as PaginatedItems<UserDTO>).data).toHaveLength(0);
  });

  it('PATCH /users/:id atualiza nome e role', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/users/${userId}`)
      .send({ name: 'E2E Professor', role: 'professor' })
      .expect(200);

    expect(response.body as UserDTO).toMatchObject({ name: 'E2E Professor', role: 'professor' });
  });

  it('DELETE /users/:id faz soft delete', async () => {
    await request(app.getHttpServer()).delete(`/users/${userId}`).expect(204);

    await request(app.getHttpServer()).get(`/users/${userId}`).expect(404);

    const stored = await prisma.user.findUnique({ where: { id: userId } });
    expect(stored).not.toBeNull();
    expect(stored?.deletedAt).toBeInstanceOf(Date);
  });

  it('GET /users/:id inexistente dá 404', async () => {
    await request(app.getHttpServer())
      .get('/users/11111111-1111-4111-8111-111111111111')
      .expect(404);
  });
});
