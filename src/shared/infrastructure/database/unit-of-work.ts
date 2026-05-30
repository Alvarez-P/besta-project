import type { Sequelize, Transaction } from 'sequelize';
import type { BaseRepository } from './base.repository';

export class UnitOfWork {
  private transaction: Transaction | null = null;

  constructor(private sequelize: Sequelize) {}

  getRepository<T extends BaseRepository<any>>(RepoClass: new () => T): T {
    const instance = new RepoClass();
    instance.setTransaction(this.transaction);
    return instance;
  }

  async start(): Promise<void> {
    this.transaction = await this.sequelize.transaction();
  }

  async commit(): Promise<void> {
    if (!this.transaction) throw new Error('No active transaction');
    await this.transaction.commit();
    this.transaction = null;
  }

  async rollback(): Promise<void> {
    if (!this.transaction) throw new Error('No active transaction');
    await this.transaction.rollback();
    this.transaction = null;
  }

  async execute<T>(fn: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    await this.start();
    try {
      const result = await fn(this);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}
