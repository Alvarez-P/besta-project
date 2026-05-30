import type { Repository } from '../../../shared/domain/repository.interface';
import type { UserModel } from '../infrastructure/user.model';

export interface UserRepository extends Repository<UserModel> {
  findByEmail(email: string): Promise<UserModel | null>;
  existsByEmail(email: string): Promise<boolean>;
}
