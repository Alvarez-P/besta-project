/// <reference types="jest" />

import type { Sequelize } from 'sequelize';
import { DeleteUserUseCase } from '../../../src/context/user/application/delete-user.usecase';
import { UserModel } from '../../../src/context/user/infrastructure/user.model';
import { PasswordService } from '../../../src/shared/infrastructure/crypto/password.service';
import { initSequelize } from '../../../src/shared/infrastructure/database/sequelize';
import { UnitOfWork } from '../../../src/shared/infrastructure/database/unit-of-work';
import { NotFoundError } from '../../../src/shared/infrastructure/errors/http.errors';

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

async function seedUser(email: string, password: string, name = 'Test User'): Promise<UserModel> {
  const passwordService = new PasswordService();
  const hashed = await passwordService.hash(password);
  return UserModel.create({ name, email, password: hashed } as any);
}

describe('DeleteUserUseCase', () => {
  it('deletes an existing user', async () => {
    const user = await seedUser('delete@test.com', 'password123', 'Delete Me');
    const useCase = new DeleteUserUseCase(uow);

    await useCase.execute(user.id);

    const found = await UserModel.findByPk(user.id);
    expect(found).toBeNull();
  });

  it('throws NotFoundError when deleting non-existent user', async () => {
    const useCase = new DeleteUserUseCase(uow);

    await expect(useCase.execute('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError with id in message', async () => {
    const useCase = new DeleteUserUseCase(uow);

    await expect(useCase.execute('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
      'User with id "550e8400-e29b-41d4-a716-446655440000" not found',
    );
  });

  it('only deletes the specified user', async () => {
    const user1 = await seedUser('keep@test.com', 'password123', 'Keep');
    const user2 = await seedUser('remove@test.com', 'password123', 'Remove');
    const useCase = new DeleteUserUseCase(uow);

    await useCase.execute(user2.id);

    const kept = await UserModel.findByPk(user1.id);
    expect(kept).not.toBeNull();
    const removed = await UserModel.findByPk(user2.id);
    expect(removed).toBeNull();
  });
});
