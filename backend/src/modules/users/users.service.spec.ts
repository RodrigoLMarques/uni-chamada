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
  name: 'Professor',
  email: 'professor@unifesp.br',
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
    it('faz hash da senha e deixa o id para o banco gerar', async () => {
      repository.findByEmail.mockResolvedValue(null);

      const user = await service.create({
        name: 'Nova',
        email: 'nova@unifesp.br',
        password: 'segredo123',
      });

      expect(user.passwordHash).not.toBe('segredo123');
      expect(await bcrypt.compare('segredo123', user.passwordHash)).toBe(true);

      const [created] = repository.create.mock.calls[0];
      expect(created).not.toHaveProperty('id');
    });

    it('recusa email já em uso', async () => {
      repository.findByEmail.mockResolvedValue(existing);

      await expect(
        service.create({ name: 'Outro', email: existing.email, password: 'segredo123' }),
      ).rejects.toThrow(UserConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('estoura quando não encontra', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById(existing.id)).rejects.toThrow(UserNotFoundException);
    });
  });

  describe('update', () => {
    it('recusa trocar para um email já em uso', async () => {
      repository.findById.mockResolvedValue(existing);
      repository.findByEmail.mockResolvedValue({ ...existing, id: BigInt(99) });

      await expect(service.update(existing.id, { email: 'ocupado@unifesp.br' })).rejects.toThrow(
        UserConflictException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('não checa conflito quando o email não muda', async () => {
      repository.findById.mockResolvedValue(existing);

      await service.update(existing.id, { email: existing.email, name: 'Novo Nome' });

      expect(repository.findByEmail).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(existing.id, {
        email: existing.email,
        name: 'Novo Nome',
      });
    });

    it('estoura quando o usuário não existe', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update(existing.id, { name: 'X' })).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('delega a remoção ao repositório', async () => {
      repository.findById.mockResolvedValue(existing);
      await service.remove(existing.id);
      expect(repository.remove).toHaveBeenCalledWith(existing.id);
    });

    it('estoura quando o usuário não existe', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.remove(existing.id)).rejects.toThrow(UserNotFoundException);
    });
  });
});
