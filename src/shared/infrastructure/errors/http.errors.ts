import { BaseError } from './base.error';

export class BadRequestError extends BaseError {
  constructor(message = 'Bad request') {
    super(message, 'BAD_REQUEST', 400);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends BaseError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends BaseError {
  constructor(message = 'Conflict') {
    super(message, 'CONFLICT', 409);
  }
}

export class ValidationError extends BaseError {
  public readonly details: unknown;

  constructor(message = 'Validation error', details?: unknown) {
    super(message, 'VALIDATION_ERROR', 422);
    this.details = details;
  }
}

export class InternalServerError extends BaseError {
  constructor(message = 'Internal server error') {
    super(message, 'INTERNAL_ERROR', 500);
  }
}
