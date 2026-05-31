import type { CircuitBreaker } from '../../../shared/infrastructure/circuit-breaker';
import { getSequelizeInstance } from '../../../shared/infrastructure/database/sequelize';

export interface HealthStatus {
  status: string;
  database: string;
  uptime: number;
}

export async function executeHealthCheck(dbBreaker?: CircuitBreaker): Promise<HealthStatus> {
  const sequelize = getSequelizeInstance();
  let databaseStatus = 'not_initialized';

  if (sequelize) {
    try {
      if (dbBreaker) {
        await dbBreaker.execute(() => sequelize.authenticate());
        databaseStatus = 'connected';
      } else {
        await sequelize.authenticate();
        databaseStatus = 'connected';
      }
    } catch {
      databaseStatus = 'disconnected';
    }
  }

  return {
    status: 'healthy',
    database: databaseStatus,
    uptime: process.uptime(),
  };
}
