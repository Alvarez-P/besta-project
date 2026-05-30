import type {
  Attributes,
  CreateOptions,
  DestroyOptions,
  FindOptions,
  Model,
  ModelStatic,
  Transaction,
  UpdateOptions,
} from 'sequelize';
import type { Col, Fn, Literal, MakeNullishOptional } from 'sequelize/lib/utils';
import type { Repository } from '../../domain/repository.interface';

export abstract class BaseRepository<T extends Model> implements Repository<T> {
  protected transaction: Transaction | null = null;

  constructor(public model: ModelStatic<T>) {}

  setTransaction(tx: Transaction | null): this {
    this.transaction = tx;
    return this;
  }

  find(options?: FindOptions<Attributes<T>>): Promise<T[]> {
    return this.model.findAll({ transaction: this.transaction, ...options });
  }

  findOne(options?: FindOptions<Attributes<T>>): Promise<T | null> {
    return this.model.findOne({ transaction: this.transaction, ...options });
  }

  delete(options?: DestroyOptions<Attributes<T>>): Promise<number> {
    const transaction = this.transaction;
    return this.model.destroy({ transaction, ...options });
  }

  update(
    data: {
      [key in keyof Attributes<T>]?: Fn | Col | Literal | Attributes<T>[key] | undefined;
    },
    options: Omit<UpdateOptions<Attributes<T>>, 'returning'> & {
      returning: Exclude<UpdateOptions<Attributes<T>>['returning'], undefined | false>;
    },
  ): Promise<[affectedCount: number, affectedRows: T[]]> {
    return this.model.update(data, { transaction: this.transaction, ...options });
  }

  create(
    data: MakeNullishOptional<T['_creationAttributes']>,
    options?: CreateOptions<Attributes<T>> | undefined,
  ): Promise<T> {
    const transaction = this.transaction;
    return this.model.create(data, { transaction, ...options });
  }
}
