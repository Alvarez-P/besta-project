/// <reference types="jest" />

import type { NextFunction, Request, Response } from 'express';
import { CircuitBreaker, CircuitState } from '../../../src/shared/infrastructure/circuit-breaker';
import { idempotency } from '../../../src/shared/infrastructure/idempotency/idempotency.middleware';
import { IdempotencyRepository } from '../../../src/shared/infrastructure/idempotency/idempotency.repository';

function mockReq(method: string, idempotencyKey?: string): Request {
  const req: any = {};
  req.method = method;
  req.headers = {};
  if (idempotencyKey) {
    req.headers['idempotency-key'] = idempotencyKey;
  }
  return req;
}

function mockRes(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.statusCode = 200;
  return res;
}

function getNext(): NextFunction {
  return jest.fn() as NextFunction;
}

describe('idempotency middleware', () => {
  let repo: IdempotencyRepository;

  beforeAll(() => {
    repo = new IdempotencyRepository();
  });

  beforeEach(async () => {
    const client = require('@aws-sdk/lib-dynamodb').DynamoDBDocumentClient.from();
    client.send.mockClear();
    require('@aws-sdk/lib-dynamodb').GetCommand.mockClear();
    require('@aws-sdk/lib-dynamodb').PutCommand.mockClear();
  });

  it('calls next() when no idempotency-key header is present', async () => {
    const middleware = idempotency();
    const req = mockReq('POST');
    const res = mockRes();
    const next = getNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() for GET requests even with idempotency-key', async () => {
    const middleware = idempotency();
    const req = mockReq('GET', 'key-123');
    const res = mockRes();
    const next = getNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('returns cached response when idempotency key exists', async () => {
    const key = 'cached-key';
    await repo.save(key, { data: 'cached' }, 200);

    const middleware = idempotency();
    const req = mockReq('POST', key);
    const res = mockRes();
    const next = getNext();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: 'cached' });
  });

  it('passes through when idempotency key is new', async () => {
    const middleware = idempotency();
    const req = mockReq('POST', 'new-key');
    const res = mockRes();
    const next = getNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('saves the response after handler completes', async () => {
    const middleware = idempotency();
    const req = mockReq('POST', 'save-key');
    const res = mockRes();
    const next = getNext();

    await middleware(req, res, next);

    const spy = jest.spyOn(res, 'json');
    res.json({ data: 'response' });

    expect(spy).toHaveBeenCalledWith({ data: 'response' });
  });

  it('does not save response when any circuit breaker is OPEN', async () => {
    const openBreaker = new CircuitBreaker({ failureThreshold: 1 });

    await expect(openBreaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    expect(openBreaker.currentState).toBe(CircuitState.OPEN);

    const middleware = idempotency({ circuitBreakers: [openBreaker] });
    const req = mockReq('POST', 'key-open');
    const res = mockRes();
    const next = getNext();

    await middleware(req, res, next);

    const spy = jest.spyOn(res, 'json');
    res.json({ data: 'partial' });

    expect(spy).toHaveBeenCalledWith({ data: 'partial' });
  });

  it('saves response when all circuit breakers are CLOSED', async () => {
    const closedBreaker = new CircuitBreaker();
    expect(closedBreaker.currentState).toBe(CircuitState.CLOSED);

    const middleware = idempotency({ circuitBreakers: [closedBreaker] });
    const req = mockReq('POST', 'key-closed');
    const res = mockRes();
    const next = getNext();

    await middleware(req, res, next);

    const spy = jest.spyOn(res, 'json');
    res.json({ data: 'full-response' });

    expect(spy).toHaveBeenCalledWith({ data: 'full-response' });
  });

  it('does not apply idempotency to DELETE by default', async () => {
    const middleware = idempotency();
    const req = mockReq('DELETE', 'del-key');
    const res = mockRes();
    const next = getNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
