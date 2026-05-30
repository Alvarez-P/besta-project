import type { Router } from 'express';
import { executeHealthCheck } from '../application/check.usecase';

export function registerHealthRoutes(app: Router): void {
  app.get('/health', async (_req, res) => {
    const status = await executeHealthCheck();
    res.json(status);
  });
}
