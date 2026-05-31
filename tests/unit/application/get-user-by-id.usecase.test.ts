/// <reference types="jest" />

import type { Sequelize } from 'sequelize';
import { GetUserByIdUseCase } from '../../../src/context/user/application/get-user-by-id.usecase';
import { UserModel } from '../../../src/context/user/infrastructure/user.model';
import { PasswordService } from '../../../src/shared/infrastructure/crypto/password.service';
import { initSequelize } from '../../../src/shared/infrastructure/database/sequelize';
import { NotFoundError } from '../../../src/shared/infrastructure/errors/http.errors';

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

async function seedUser(email: string, password: string, name = 'Test User'): Promise<UserModel> {
  const passwordService = new PasswordService();
  const hashed = await passwordService.hash(password);
  return UserModel.create({ name, email, password: hashed } as any);
}

describe('GetUserByIdUseCase', () => {
  it('returns user by id', async () => {
    const user = await seedUser('findbyid@test.com', 'password123', 'Find Me');
    const useCase = new GetUserByIdUseCase();

    const result = await useCase.execute(user.id);

    expect(result.id).toBe(user.id);
    expect(result.name).toBe('Find Me');
    expect(result.email).toBe('findbyid@test.com');
    expect(result.password).toBeUndefined();
  });

  it('throws NotFoundError for non-existent id', async () => {
    const useCase = new GetUserByIdUseCase();

    await expect(useCase.execute('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError with id in message', async () => {
    const useCase = new GetUserByIdUseCase();

    await expect(useCase.execute('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
      'User with id "550e8400-e29b-41d4-a716-446655440000" not found',
    );
  });
});
