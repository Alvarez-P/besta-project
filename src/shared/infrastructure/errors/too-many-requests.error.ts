import { BaseError } from './base.error';

export class TooManyRequestsError extends BaseError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 'TOO_MANY_REQUESTS', 429);
  }
}
