import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { registerAuthRoutes } from './context/auth/infrastructure/auth.controller';
import { registerHealthRoutes } from './context/health/infrastructure/health.controller';
import { registerUserRoutes } from './context/user/infrastructure/user.controller';
import { initSequelize } from './shared/infrastructure/database/sequelize';
import { UnitOfWork } from './shared/infrastructure/database/unit-of-work';
import { errorHandler } from './shared/infrastructure/middleware/error-handler';
import { swaggerDefinition } from './shared/infrastructure/swagger/swagger';

export async function createApp(): Promise<express.Application> {
  const sequelize = await initSequelize();
  const uow = new UnitOfWork(sequelize);

  const app = express();

  app.use(express.json());

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition));

  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerDefinition);
  });

  registerHealthRoutes(app);
  registerAuthRoutes(app);
  registerUserRoutes(app, uow);

  app.use(errorHandler);

  return app;
}
