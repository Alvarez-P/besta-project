import type { NextFunction, Request, Response } from 'express';
import type { ZodError, ZodSchema } from 'zod';
import { ValidationError } from '../errors/http.errors';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const zodError = result.error as ZodError;
      const details = zodError.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return next(new ValidationError('Validation error', details));
    }

    req.body = (result.data as any).body ?? req.body;
    next();
  };
}
