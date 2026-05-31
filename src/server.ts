import express from 'express';
import { registerAuthRoutes } from './context/auth/infrastructure/auth.controller';
import { registerHealthRoutes } from './context/health/infrastructure/health.controller';
import { registerUserRoutes } from './context/user/infrastructure/user.controller';
import { CircuitBreaker } from './shared/infrastructure/circuit-breaker';
import { initSequelize } from './shared/infrastructure/database/sequelize';
import { UnitOfWork } from './shared/infrastructure/database/unit-of-work';
import { idempotency } from './shared/infrastructure/idempotency/idempotency.middleware';
import { errorHandler } from './shared/infrastructure/middleware/error-handler';
import { rateLimiter } from './shared/infrastructure/middleware/rate-limiter';
import { swaggerDefinition } from './shared/infrastructure/swagger/swagger';

export const sesBreaker = new CircuitBreaker({ failureThreshold: 5, resetTimeout: 30_000 });
export const dbBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 10_000 });

export async function createApp(): Promise<express.Application> {
  const sequelize = await initSequelize();
  const uow = new UnitOfWork(sequelize);

  const app = express();

  app.use(rateLimiter({ windowMs: 60_000, maxRequests: 100 }));
  app.use(express.json());
  app.use(idempotency({ circuitBreakers: [sesBreaker, dbBreaker] }));

  app.get('/api-docs', (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Besta API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: window.location.href.replace(/\\/api-docs\\/?$/, '/api-docs.json'),
      dom_id: '#swagger-ui',
      defaultModelsExpandDepth: -1
    });
  </script>
</body>
</html>`);
  });

  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerDefinition);
  });

  registerHealthRoutes(app, dbBreaker);
  registerAuthRoutes(app);
  registerUserRoutes(app, uow, sesBreaker);

  app.use(errorHandler);

  return app;
}
