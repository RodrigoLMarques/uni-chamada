import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserConflictException } from './exceptions/user-conflict.exception';
import { UserNotFoundException } from './exceptions/user-not-found.exception';
import { UserEntity } from './models/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UsersService } from './users.service';

const existing: UserEntity = {
  id: BigInt(1),
  name: 'Teacher',
  email: 'teacher@unifesp.br',
  passwordHash: 'hash',
};

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(async () => {
    const repositoryMock = {
      create: jest.fn((user: Omit<UserEntity, 'id'>) =>
        Promise.resolve({ ...user, id: BigInt(2) }),
      ),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn((id: bigint, data: Partial<UserEntity>) =>
        Promise.resolve({ ...existing, ...data }),
      ),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UserRepository, useValue: repositoryMock },
        { provide: ConfigService, useValue: { get: (_: string, fallback: unknown) => fallback } },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UserRepository);
  });

  describe('create', () => {
    it('hashes the password and leaves the id for the database', async () => {
      repository.findByEmail.mockResolvedValue(null);

      const user = await service.create({
        name: 'New',
        email: 'new@unifesp.br',
        password: 'secret123',
      });

      expect(user.passwordHash).not.toBe('secret123');
      expect(await bcrypt.compare('secret123', user.passwordHash)).toBe(true);

      const [created] = repository.create.mock.calls[0];
      expect(created).not.toHaveProperty('id');
    });

    it('rejects an email already in use', async () => {
      repository.findByEmail.mockResolvedValue(existing);

      await expect(
        service.create({ name: 'Another', email: existing.email, password: 'secret123' }),
      ).rejects.toThrow(UserConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('throws when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(existing.id)).rejects.toThrow(UserNotFoundException);
    });
  });

  describe('update', () => {
    it('rejects changing to an email already in use', async () => {
      repository.findById.mockResolvedValue(existing);
      repository.findByEmail.mockResolvedValue({ ...existing, id: BigInt(99) });

      await expect(service.update(existing.id, { email: 'taken@unifesp.br' })).rejects.toThrow(
        UserConflictException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('does not check conflict when the email is unchanged', async () => {
      repository.findById.mockResolvedValue(existing);

      await service.update(existing.id, { email: existing.email, name: 'New Name' });

      expect(repository.findByEmail).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(existing.id, {
        email: existing.email,
        name: 'New Name',
      });
    });

    it('throws when the user does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(existing.id, { name: 'X' })).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('delegates removal to the repository', async () => {
      repository.findById.mockResolvedValue(existing);
      await service.remove(existing.id);
      expect(repository.remove).toHaveBeenCalledWith(existing.id);
    });

    it('throws when the user does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.remove(existing.id)).rejects.toThrow(UserNotFoundException);
    });
  });
});
