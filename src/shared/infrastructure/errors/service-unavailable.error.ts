import { BaseError } from './base.error';

export class ServiceUnavailableError extends BaseError {
  constructor(message = 'Service temporarily unavailable, please try again later') {
    super(message, 'SERVICE_UNAVAILABLE', 503);
  }
}
