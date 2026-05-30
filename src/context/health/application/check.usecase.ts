import { getSequelizeInstance } from '../../../shared/infrastructure/database/sequelize';

export interface HealthStatus {
  status: string;
  database: string;
  uptime: number;
}

export async function executeHealthCheck(): Promise<HealthStatus> {
  const sequelize = getSequelizeInstance();
  let databaseStatus = 'not_initialized';

  if (sequelize) {
    try {
      await sequelize.authenticate();
      databaseStatus = 'connected';
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
