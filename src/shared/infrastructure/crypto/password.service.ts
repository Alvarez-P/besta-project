import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify<string, string, number, Buffer>(scrypt);

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const SEPARATOR = ':';

export class PasswordService {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH).toString('base64');
    const derivedKey = await scryptAsync(plain, salt, KEY_LENGTH);
    return `${salt}${SEPARATOR}${derivedKey.toString('base64')}`;
  }

  async verify(plain: string, hashed: string): Promise<boolean> {
    const [salt, key] = hashed.split(SEPARATOR);
    if (!salt || !key) return false;

    const derivedKey = await scryptAsync(plain, salt, KEY_LENGTH);
    const keyBuffer = Buffer.from(key, 'base64');

    if (derivedKey.length !== keyBuffer.length) return false;

    return timingSafeEqual(derivedKey, keyBuffer);
  }
}
