/// <reference types="jest" />

import type { Sequelize } from 'sequelize';
import { UpdateUserUseCase } from '../../../src/context/user/application/update-user.usecase';
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

describe('UpdateUserUseCase', () => {
  it('updates user name', async () => {
    const user = await seedUser('update@test.com', 'password123', 'Old Name');
    const useCase = new UpdateUserUseCase(uow);

    const result = await useCase.execute(user.id, { name: 'New Name' });

    expect(result.name).toBe('New Name');
    expect(result.email).toBe('update@test.com');
  });

  it('updates user email', async () => {
    const user = await seedUser('old@test.com', 'password123', 'Email Changer');
    const useCase = new UpdateUserUseCase(uow);

    const result = await useCase.execute(user.id, { email: 'new@test.com' });

    expect(result.email).toBe('new@test.com');
  });

  it('updates user password', async () => {
    const user = await seedUser('pw@test.com', 'oldpassword123', 'PW User');
    const useCase = new UpdateUserUseCase(uow);

    await useCase.execute(user.id, { password: 'newpassword456' });

    const updated = await UserModel.findByPk(user.id);
    const passwordService = new PasswordService();
    const valid = await passwordService.verify('newpassword456', updated!.password);
    expect(valid).toBe(true);
  });

  it('updates multiple fields at once', async () => {
    const user = await seedUser('multi@test.com', 'password123', 'Multi');
    const useCase = new UpdateUserUseCase(uow);

    const result = await useCase.execute(user.id, {
      name: 'Multi Updated',
      email: 'multi-updated@test.com',
    });

    expect(result.name).toBe('Multi Updated');
    expect(result.email).toBe('multi-updated@test.com');
  });

  it('throws NotFoundError for non-existent user', async () => {
    const useCase = new UpdateUserUseCase(uow);

    await expect(useCase.execute('00000000-0000-0000-0000-000000000000', { name: 'Ghost' })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('does not change fields when update data is empty', async () => {
    const user = await seedUser('nochange@test.com', 'password123', 'No Change');
    const useCase = new UpdateUserUseCase(uow);

    const result = await useCase.execute(user.id, {});

    expect(result.name).toBe('No Change');
    expect(result.email).toBe('nochange@test.com');
  });

  it('does not return password in response', async () => {
    const user = await seedUser('nopass@test.com', 'password123', 'NoPass');
    const useCase = new UpdateUserUseCase(uow);

    const result = await useCase.execute(user.id, { name: 'Changed' });

    expect((result as any).password).toBeUndefined();
  });
});
