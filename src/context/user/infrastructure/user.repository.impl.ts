import { BaseRepository } from '../../../shared/infrastructure/database/base.repository';
import { UserModel } from './user.model';

export class UserRepository extends BaseRepository<UserModel> {
  constructor() {
    super(UserModel);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const found = await this.findOne({ where: { email } });
    return found !== null;
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    return this.findOne({ where: { email } });
  }
}
