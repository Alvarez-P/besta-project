import { ConflictError } from '../../../shared/infrastructure/errors/http.errors';
import type { UserRepository } from '../infrastructure/user.repository.impl';

export class UserService {
  async ensureEmailIsUnique(email: string, repo: UserRepository): Promise<void> {
    const existing = await repo.existsByEmail(email);
    if (existing) {
      throw new ConflictError(`Email "${email}" is already in use`);
    }
  }
}
