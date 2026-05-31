/// <reference types="jest" />

import type { Sequelize } from 'sequelize';
import { LoginUseCase } from '../../../src/context/auth/application/login.usecase';
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

async function seedUser(email: string, password: string, name = 'Test User'): Promise<UserModel> {
  const passwordService = new PasswordService();
  const hashed = await passwordService.hash(password);
  return UserModel.create({ name, email, password: hashed } as any);
}

describe('LoginUseCase', () => {
  it('returns access_token for valid credentials', async () => {
    await seedUser('login@test.com', 'password123');
    const useCase = new LoginUseCase();

    const result = await useCase.execute({ email: 'login@test.com', password: 'password123' });

    expect(result.access_token).toBeDefined();
    expect(typeof result.access_token).toBe('string');
    expect(result.access_token.split('.')).toHaveLength(3);
  });

  it('throws UnauthorizedError for invalid password', async () => {
    await seedUser('login@test.com', 'password123');
    const useCase = new LoginUseCase();

    await expect(useCase.execute({ email: 'login@test.com', password: 'wrongpassword' })).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('throws UnauthorizedError for non-existent user', async () => {
    const useCase = new LoginUseCase();

    await expect(useCase.execute({ email: 'nonexistent@test.com', password: 'password123' })).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('returns a JWT that contains userId and email', async () => {
    const user = await seedUser('jwt@test.com', 'password123');
    const useCase = new LoginUseCase();

    const result = await useCase.execute({ email: 'jwt@test.com', password: 'password123' });

    const payload = JSON.parse(Buffer.from(result.access_token.split('.')[1], 'base64').toString());
    expect(payload.userId).toBe(user.id);
    expect(payload.email).toBe('jwt@test.com');
  });
});
