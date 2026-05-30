import { NotFoundError } from '../../../shared/infrastructure/errors/http.errors';
import { UserEmail } from '../domain/email.vo';
import type { User } from '../domain/user.entity';
import { UserRepository } from '../infrastructure/user.repository.impl';

export class GetUserByIdUseCase {
  async execute(id: string): Promise<User> {
    const repo = new UserRepository();
    const model = await repo.findOne({ where: { id } });

    if (!model) {
      throw new NotFoundError(`User with id "${id}" not found`);
    }

    return {
      id: model.id,
      email: UserEmail.create(model.email),
      name: model.name,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
