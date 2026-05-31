import type { NextFunction, Request, Response } from 'express';
import type { CircuitBreaker } from '../circuit-breaker';
import { CircuitState } from '../circuit-breaker';
import { ServiceUnavailableError } from '../errors/service-unavailable.error';
import { IdempotencyRepository } from './idempotency.repository';

export interface IdempotencyOptions {
  circuitBreakers?: CircuitBreaker[];
  ttlSeconds?: number;
}

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const HEADER_KEY = 'idempotency-key';

export function idempotency(options: IdempotencyOptions = {}) {
  const repo = new IdempotencyRepository();
  const circuitBreakers = options.circuitBreakers ?? [];
  const ttlSeconds = options.ttlSeconds ?? 1800;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.headers[HEADER_KEY] as string | undefined;

    if (!key || !MUTATING_METHODS.includes(req.method)) {
      return next();
    }

    const requestMethod = req.method;
    const requestPath = req.path;

    try {
      const existing = await repo.get(key);

      if (existing) {
        if (existing.method === requestMethod && existing.path === requestPath) {
          res.status(existing.statusCode).json(JSON.parse(existing.response));
          return;
        }
      }
    } catch {
      return next();
    }

    const anyOpen = circuitBreakers.some((cb) => cb.currentState === CircuitState.OPEN);

    if (anyOpen) {
      next(new ServiceUnavailableError());
      return;
    }

    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      const openAfterProcessing = circuitBreakers.some((cb) => cb.currentState === CircuitState.OPEN);

      if (!openAfterProcessing) {
        repo.save(key, body, res.statusCode, requestMethod, requestPath, ttlSeconds).catch((err) => {
          console.error('Failed to store idempotency key:', err);
        });
      }

      return originalJson(body);
    };

    next();
  };
}
