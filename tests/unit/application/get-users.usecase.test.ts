/// <reference types="jest" />

import type { Sequelize } from 'sequelize';
import { GetUsersUseCase } from '../../../src/context/user/application/get-users.usecase';
import { UserModel } from '../../../src/context/user/infrastructure/user.model';
import { PasswordService } from '../../../src/shared/infrastructure/crypto/password.service';
import { initSequelize } from '../../../src/shared/infrastructure/database/sequelize';

let sequelize: Sequelize;

beforeAll(async () => {
  sequelize = await initSequelize();
});

beforeEach(async () => {
  await UserModel.truncate({ cascade: true });
});

afterAll(async () => {
  await sequelize.close();
});

async function seedUsers(count: number): Promise<UserModel[]> {
  const passwordService = new PasswordService();
  const hashed = await passwordService.hash('password123');
  const users: UserModel[] = [];
  for (let i = 0; i < count; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const user = await UserModel.create({
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      password: hashed,
    } as any);
    users.push(user);
  }
  return users;
}

describe('GetUsersUseCase', () => {
  it('returns paginated users', async () => {
    await seedUsers(5);
    const useCase = new GetUsersUseCase();

    const result = await useCase.execute({ offset: 0, limit: 10 });

    expect(result.data).toHaveLength(5);
    expect(result.meta.total).toBe(5);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(10);
  });

  it('respects pagination offset and limit', async () => {
    await seedUsers(10);
    const useCase = new GetUsersUseCase();

    const result = await useCase.execute({ offset: 3, limit: 3 });

    expect(result.data).toHaveLength(3);
    expect(result.meta.total).toBe(10);
  });

  it('returns empty array when no users exist', async () => {
    const useCase = new GetUsersUseCase();

    const result = await useCase.execute({});

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('filters by name', async () => {
    await seedUsers(3);
    const useCase = new GetUsersUseCase();

    const result = await useCase.execute({ name: 'User 1' });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('User 1');
  });

  it('returns users sorted by createdAt DESC', async () => {
    const users = await seedUsers(3);
    const useCase = new GetUsersUseCase();

    const result = await useCase.execute({});

    expect(result.data[0].id).toBe(users[2].id);
    expect(result.data[2].id).toBe(users[0].id);
  });

  it('does not expose passwords in response', async () => {
    await seedUsers(1);
    const useCase = new GetUsersUseCase();

    const result = await useCase.execute({});

    expect(result.data[0]).not.toHaveProperty('password');
  });

  it('defaults to limit 20 when not specified', async () => {
    await seedUsers(5);
    const useCase = new GetUsersUseCase();

    const result = await useCase.execute({});

    expect(result.meta.limit).toBe(20);
  });
});
