import type { UnitOfWork } from '../../../shared/infrastructure/database/unit-of-work';
import { NotFoundError } from '../../../shared/infrastructure/errors/http.errors';
import { UserRepository } from '../infrastructure/user.repository.impl';

export class DeleteUserUseCase {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(id: string): Promise<void> {
    await this.uow.execute(async (uow) => {
      const repo = uow.getRepository(UserRepository);

      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw new NotFoundError(`User with id "${id}" not found`);
      }

      await repo.delete({ where: { id } });
    });
  }
}
