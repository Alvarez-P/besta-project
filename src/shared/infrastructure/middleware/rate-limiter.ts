import type { NextFunction, Request, Response } from 'express';
import { TooManyRequestsError } from '../errors/too-many-requests.error';

export interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function rateLimiter(config: RateLimiterConfig = { windowMs: 60_000, maxRequests: 100 }) {
  const store = new Map<string, RateLimitEntry>();

  const _cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, config.windowMs).unref();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + config.windowMs });
      setHeaders(_res, config.maxRequests, config.maxRequests - 1, Math.ceil((now + config.windowMs) / 1000));
      next();
      return;
    }

    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      _res.setHeader('Retry-After', retryAfter);
      next(new TooManyRequestsError(`Rate limit exceeded. Try again in ${retryAfter}s`));
      return;
    }

    entry.count++;
    setHeaders(_res, config.maxRequests, config.maxRequests - entry.count, Math.ceil(entry.resetAt / 1000));
    next();
  };
}

function setHeaders(res: Response, limit: number, remaining: number, reset: number): void {
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', reset);
}
