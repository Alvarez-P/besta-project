/// <reference types="jest" />

import type { Sequelize } from 'sequelize';
import { CreateUserUseCase } from '../../../src/context/user/application/create-user.usecase';
import { UserModel } from '../../../src/context/user/infrastructure/user.model';
import { initSequelize } from '../../../src/shared/infrastructure/database/sequelize';
import { UnitOfWork } from '../../../src/shared/infrastructure/database/unit-of-work';
import { ConflictError } from '../../../src/shared/infrastructure/errors/http.errors';

let sequelize: Sequelize;
let uow: UnitOfWork;

beforeAll(async () => {
  sequelize = await initSequelize();
  uow = new UnitOfWork(sequelize);
});

beforeEach(async () => {
  await UserModel.truncate({ cascade: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('CreateUserUseCase', () => {
  it('creates a user and returns user data', async () => {
    const useCase = new CreateUserUseCase(uow);
    const dto = { name: 'John Doe', email: 'john@example.com', password: 'password123' };

    const result = await useCase.execute(dto);

    expect(result.id).toBeDefined();
    expect(result.name).toBe('John Doe');
    expect(result.email).toBe('john@example.com');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('hashes the password in the database', async () => {
    const useCase = new CreateUserUseCase(uow);
    const dto = { name: 'Jane', email: 'jane@example.com', password: 'secret1234' };

    await useCase.execute(dto);

    const user = await UserModel.findOne({ where: { email: 'jane@example.com' } });
    expect(user).not.toBeNull();
    expect(user!.password).not.toBe('secret1234');
    expect(user!.password).toContain(':');
  });

  it('throws ConflictError for duplicate email', async () => {
    const useCase = new CreateUserUseCase(uow);
    const dto = { name: 'User One', email: 'dup@example.com', password: 'password123' };

    await useCase.execute(dto);

    await expect(
      useCase.execute({ name: 'User Two', email: 'dup@example.com', password: 'password456' }),
    ).rejects.toThrow(ConflictError);
  });

  it('normalizes email to lowercase', async () => {
    const useCase = new CreateUserUseCase(uow);
    const dto = { name: 'Test', email: 'MIXED@Example.COM', password: 'password123' };

    const result = await useCase.execute(dto);

    expect(result.email).toBe('mixed@example.com');
  });

  it('does not return password in response', async () => {
    const useCase = new CreateUserUseCase(uow);
    const dto = { name: 'NoPass', email: 'nopass@example.com', password: 'password123' };

    const result = await useCase.execute(dto);

    expect((result as any).password).toBeUndefined();
  });

  it('generates a UUID for the user id', async () => {
    const useCase = new CreateUserUseCase(uow);
    const dto = { name: 'UUID', email: 'uuid@example.com', password: 'password123' };

    const result = await useCase.execute(dto);

    expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
