import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export class JwtService {
  sign(payload: { userId: string; email: string }, secret: string): string {
    return jwt.sign(payload, secret, { expiresIn: 3600 });
  }

  verify(token: string, secret: string): JwtPayload {
    return jwt.verify(token, secret) as JwtPayload;
  }
}
