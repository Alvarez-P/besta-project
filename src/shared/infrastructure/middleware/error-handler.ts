import type { NextFunction, Request, Response } from 'express';
import { BaseError } from '../errors/base.error';
import { InternalServerError } from '../errors/http.errors';
import type { ApiErrorResponse } from '../response';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof BaseError) {
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: (err as any).details,
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  console.error('Unhandled error:', err);

  const internal = new InternalServerError();
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: internal.code,
      message: internal.message,
    },
  };
  res.status(500).json(body);
}
