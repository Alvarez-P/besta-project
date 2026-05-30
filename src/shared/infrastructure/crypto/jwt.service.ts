import { createHmac } from 'node:crypto';

export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

function base64urlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function base64urlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

export class JwtService {
  private readonly algorithm = 'sha256';
  private readonly expirationSeconds: number;

  constructor(expirationSeconds = 3600) {
    this.expirationSeconds = expirationSeconds;
  }

  sign(payload: { userId: string; email: string }, secret: string): string {
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + this.expirationSeconds,
    };

    const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64urlEncode(JSON.stringify(jwtPayload));
    const signature = createHmac(this.algorithm, secret).update(`${header}.${body}`).digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  verify(token: string, secret: string): JwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [headerB64, bodyB64, signature] = parts;

    const expectedSignature = createHmac(this.algorithm, secret).update(`${headerB64}.${bodyB64}`).digest('base64url');

    if (signature !== expectedSignature) {
      throw new Error('Invalid token signature');
    }

    const payload: JwtPayload = JSON.parse(base64urlDecode(bodyB64));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token has expired');
    }

    return payload;
  }
}
