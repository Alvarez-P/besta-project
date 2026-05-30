import { UserEmail } from '../domain/email.vo';
import type { User } from '../domain/user.entity';
import { UserRepository } from '../infrastructure/user.repository.impl';
import { buildUserFilter } from '../infrastructure/user-filter.adapter';
import type { QueryUserDto } from './dtos/query-user.dto';

export interface PaginatedResult<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

export class GetUsersUseCase {
  async execute(query: QueryUserDto): Promise<PaginatedResult<User>> {
    const filter = buildUserFilter(query);
    const repo = new UserRepository();

    const { rows, count } = await repo.model.findAndCountAll({
      where: filter.where,
      limit: filter.limit,
      offset: filter.offset,
      order: [['createdAt', 'DESC']],
    });

    const users: User[] = rows.map((m) => ({
      id: m.id,
      email: UserEmail.create(m.email),
      name: m.name,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    return {
      data: users,
      meta: { page: query.page || 1, limit: query.limit || 20, total: count },
    };
  }
}
