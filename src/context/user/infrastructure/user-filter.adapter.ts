import type { WhereOptions } from 'sequelize';
import { Op } from 'sequelize';
import type { QueryUserDto } from '../application/dtos/query-user.dto';

export interface UserFilter {
  where: WhereOptions<any>;
  limit: number;
  offset: number;
}

export function buildUserFilter(query: QueryUserDto): UserFilter {
  const limit = query.limit || 20;
  const offset = query.offset || 0;

  const where: WhereOptions<any> = {};

  if (query.name) {
    where.name = { [Op.like]: `%${query.name}%` };
  }

  return { where, limit, offset };
}
