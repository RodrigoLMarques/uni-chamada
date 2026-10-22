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
      id: 'user1xxxxxxxxxxxxxxxxxxx',
      name: 'Teacher',
      email: 'teacher@unifesp.br',
      passwordHash: await bcrypt.hash('secret123', 4),
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
    it('returns a token and the user without the password', async () => {
      repository.findUserByEmail.mockResolvedValue(stored);

      const result = await service.login({ email: stored.email, password: 'secret123' });

      expect(result.accessToken).toBe('token');
      expect(result.user).toEqual({
        id: stored.id,
        name: stored.name,
        email: stored.email,
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('signs the token with sub and email', async () => {
      repository.findUserByEmail.mockResolvedValue(stored);

      await service.login({ email: stored.email, password: 'secret123' });

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: stored.id,
        email: stored.email,
      });
    });

    it('rejects a wrong password', async () => {
      repository.findUserByEmail.mockResolvedValue(stored);

      await expect(service.login({ email: stored.email, password: 'wrong' })).rejects.toThrow(
        'invalid_credentials',
      );
    });

    it('rejects an unknown email without revealing the account does not exist', async () => {
      repository.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@unifesp.br', password: 'secret123' }),
      ).rejects.toThrow('invalid_credentials');
    });
  });

  describe('updatePassword', () => {
    it('changes the password when the current one matches', async () => {
      repository.findUserById.mockResolvedValue(stored);

      const result = await service.updatePassword(stored.id, {
        currentPassword: 'secret123',
        newPassword: 'newsecret123',
      });

      expect(result).toEqual({ message: 'password_updated' });

      const [, hashed] = repository.updatePassword.mock.calls[0];
      expect(await bcrypt.compare('newsecret123', hashed)).toBe(true);
    });

    it('rejects when the current password is wrong', async () => {
      repository.findUserById.mockResolvedValue(stored);

      await expect(
        service.updatePassword(stored.id, {
          currentPassword: 'wrong',
          newPassword: 'newsecret123',
        }),
      ).rejects.toThrow('invalid_credentials');
      expect(repository.updatePassword).not.toHaveBeenCalled();
    });
  });
});
