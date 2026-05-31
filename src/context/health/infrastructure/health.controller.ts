import type { Router } from 'express';
import type { CircuitBreaker } from '../../../shared/infrastructure/circuit-breaker';
import { executeHealthCheck } from '../application/check.usecase';

export function registerHealthRoutes(app: Router, dbBreaker?: CircuitBreaker): void {
  app.get('/health', async (_req, res) => {
    const status = await executeHealthCheck(dbBreaker);
    res.json(status);
  });
}
