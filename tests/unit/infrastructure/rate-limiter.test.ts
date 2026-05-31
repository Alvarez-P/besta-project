/// <reference types="jest" />

import type { NextFunction, Request, Response } from 'express';
import { TooManyRequestsError } from '../../../src/shared/infrastructure/errors/too-many-requests.error';
import { rateLimiter } from '../../../src/shared/infrastructure/middleware/rate-limiter';

function mockReq(ip: string): Request {
  return { ip } as Request;
}

function mockRes(): Response {
  const res: any = {};
  res.setHeader = jest.fn();
  return res;
}

describe('rateLimiter', () => {
  it('calls next() when under the limit', () => {
    const middleware = rateLimiter({ windowMs: 60_000, maxRequests: 5 });
    const req = mockReq('127.0.0.1');
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() with TooManyRequestsError when limit exceeded', () => {
    const middleware = rateLimiter({ windowMs: 60_000, maxRequests: 2 });
    const req = mockReq('127.0.0.1');
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();

    const next2 = jest.fn() as NextFunction;
    middleware(req, res, next2);
    expect(next2).toHaveBeenCalledWith();

    const next3 = jest.fn() as NextFunction;
    middleware(req, res, next3);
    expect((next3 as jest.Mock).mock.calls[0][0]).toBeInstanceOf(TooManyRequestsError);
  });

  it('resets the window after windowMs', () => {
    jest.useFakeTimers();

    const middleware = rateLimiter({ windowMs: 10_000, maxRequests: 2 });
    const req = mockReq('127.0.0.1');
    const res = mockRes();

    const next = jest.fn() as NextFunction;
    middleware(req, res, next);
    middleware(req, res, next);

    const nextErr = jest.fn() as NextFunction;
    middleware(req, res, nextErr);
    expect(nextErr).toHaveBeenCalledWith(expect.any(TooManyRequestsError));

    jest.advanceTimersByTime(11_000);

    const nextAfter = jest.fn() as NextFunction;
    middleware(req, res, nextAfter);
    expect(nextAfter).toHaveBeenCalledWith();

    jest.useRealTimers();
  });

  it('different IPs have separate limits', () => {
    const middleware = rateLimiter({ windowMs: 60_000, maxRequests: 1 });
    const res = mockRes();

    const nextA = jest.fn() as NextFunction;
    middleware(mockReq('1.1.1.1'), res, nextA);
    expect(nextA).toHaveBeenCalledWith();

    const nextB = jest.fn() as NextFunction;
    middleware(mockReq('2.2.2.2'), res, nextB);
    expect(nextB).toHaveBeenCalledWith();
  });

  it('sets rate limit headers', () => {
    const middleware = rateLimiter({ windowMs: 60_000, maxRequests: 10 });
    const req = mockReq('127.0.0.1');
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 9);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
  });

  it('uses default config when none provided', () => {
    const middleware = rateLimiter();
    const req = mockReq('127.0.0.1');
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
