import type { Attributes, CreateOptions, DestroyOptions, FindOptions, Model, UpdateOptions } from 'sequelize';
import type { Col, Fn, Literal, MakeNullishOptional } from 'sequelize/lib/utils';

export interface Repository<T extends Model> {
  find(options?: FindOptions<Attributes<T>>): Promise<T[]>;
  findAndCount(options?: FindOptions<Attributes<T>>): Promise<{ rows: T[]; count: number }>;
  findOne(options?: FindOptions<Attributes<T>>): Promise<T | null>;
  delete(options?: DestroyOptions<Attributes<T>>): Promise<number>;
  update(
    data: {
      [key in keyof Attributes<T>]?: Fn | Col | Literal | Attributes<T>[key] | undefined;
    },
    options: Omit<UpdateOptions<Attributes<T>>, 'returning'> & {
      returning: Exclude<UpdateOptions<Attributes<T>>['returning'], undefined | false>;
    },
  ): Promise<[affectedCount: number, affectedRows: T[]]>;
  create(
    data: MakeNullishOptional<T['_creationAttributes']>,
    options?: CreateOptions<Attributes<T>> | undefined,
  ): Promise<T>;
}
