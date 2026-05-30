import type { NextFunction, Request, Response } from 'express';
import { JwtService } from '../crypto/jwt.service';
import { getJwtSecret } from '../crypto/jwt-secret';
import { UnauthorizedError } from '../errors/http.errors';

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}

const jwtService = new JwtService();

export async function authGuard(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const secret = await getJwtSecret();
    const payload = jwtService.verify(token, secret);

    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return next(error);
    }
    return next(new UnauthorizedError('Invalid or expired token'));
  }
}
