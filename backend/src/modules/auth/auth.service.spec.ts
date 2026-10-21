import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User } from '../../../generated/prisma/client';
import { AuthService } from './auth.service';
import { AuthRepository } from './repositories/auth.repository';

describe('AuthService', () => {
  let service: AuthService;
  let repository: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;

  let stored: User;

  beforeEach(async () => {
    stored = {
      id: BigInt(1),
      name: 'Professor',
      email: 'professor@unifesp.br',
      passwordHash: await bcrypt.hash('segredo123', 4),
      createdAt: new Date(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findUserByEmail: jest.fn(),
            findUserById: jest.fn(),
            updatePassword: jest.fn(),
          },
        },
        { provide: JwtService, useValue: { signAsync: jest.fn(() => Promise.resolve('token')) } },
        { provide: ConfigService, useValue: { get: (_: string, fallback: unknown) => fallback } },
      ],
    }).compile();

    service = module.get(AuthService);
    repository = module.get(AuthRepository);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('devolve token e usuário sem a senha', async () => {
      repository.findUserByEmail.mockResolvedValue(stored);

      const result = await service.login({ email: stored.email, password: 'segredo123' });

      expect(result.accessToken).toBe('token');
      expect(result.user).toEqual({
        id: Number(stored.id),
        name: stored.name,
        email: stored.email,
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('assina o token com sub, email e role', async () => {
      repository.findUserByEmail.mockResolvedValue(stored);

      await service.login({ email: stored.email, password: 'segredo123' });

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: stored.id.toString(),
        email: stored.email,
      });
    });

    it('recusa senha errada', async () => {
      repository.findUserByEmail.mockResolvedValue(stored);

      await expect(service.login({ email: stored.email, password: 'errada' })).rejects.toThrow(
        'invalid_credentials',
      );
    });

    it('recusa email inexistente sem revelar que a conta não existe', async () => {
      repository.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ninguem@unifesp.br', password: 'segredo123' }),
      ).rejects.toThrow('invalid_credentials');
    });
  });

  describe('updatePassword', () => {
    it('troca a senha quando a atual confere', async () => {
      repository.findUserById.mockResolvedValue(stored);

      const result = await service.updatePassword(stored.id, {
        currentPassword: 'segredo123',
        newPassword: 'novasenha123',
      });

      expect(result).toEqual({ message: 'password_updated' });

      const [, hashed] = repository.updatePassword.mock.calls[0];
      expect(await bcrypt.compare('novasenha123', hashed)).toBe(true);
    });

    it('recusa quando a senha atual está errada', async () => {
      repository.findUserById.mockResolvedValue(stored);

      await expect(
        service.updatePassword(stored.id, {
          currentPassword: 'errada',
          newPassword: 'novasenha123',
        }),
      ).rejects.toThrow('invalid_credentials');
      expect(repository.updatePassword).not.toHaveBeenCalled();
    });
  });
});
