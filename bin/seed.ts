import { randomBytes, randomUUID, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import type { CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from 'aws-lambda';
import mysql from 'mysql2/promise';

const scryptAsync = promisify<string, string, number, Buffer>(scrypt);

async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('base64');
  const derivedKey = await scryptAsync(plain, salt, 64);
  return `${salt}:${derivedKey.toString('base64')}`;
}

function generatePassword(length = 16): string {
  return randomBytes(length).toString('base64').slice(0, length).replace(/[/+]/g, 'x');
}

export const handler = async (
  event: CloudFormationCustomResourceEvent,
): Promise<CloudFormationCustomResourceResponse> => {
  if (event.RequestType === 'Delete') {
    return {
      Status: 'SUCCESS',
      PhysicalResourceId: (event as any).PhysicalResourceId || 'seed-deleted',
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      Data: {},
    };
  }

  const props = event.ResourceProperties;
  const { adminEmail, adminName, dbSecretArn } = props;

  if (!adminEmail || !adminName || !dbSecretArn) {
    return {
      Status: 'FAILED',
      Reason: 'Missing required resource properties: adminEmail, adminName, dbSecretArn',
      PhysicalResourceId: 'seed-failed-validation',
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
    };
  }

  try {
    const sm = new SecretsManagerClient({});
    const secretResp = await sm.send(new GetSecretValueCommand({ SecretId: dbSecretArn }));
    const dbCreds = JSON.parse(secretResp.SecretString!);

    const adminPassword = generatePassword();
    const hashed = await hashPassword(adminPassword);

    const conn = await mysql.createConnection({
      host: dbCreds.host,
      port: dbCreds.port,
      user: dbCreds.username,
      password: dbCreds.password,
      database: 'besta',
    });

    await conn.execute(`CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await conn.execute(
      'INSERT IGNORE INTO users (id, name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [randomUUID(), adminName, adminEmail, hashed],
    );

    const [rows] = (await conn.execute('SELECT id FROM users WHERE email = ?', [adminEmail])) as any;
    const userId = rows?.[0]?.id;

    await conn.end();

    console.log(`Admin user ready: ${adminEmail} (id: ${userId})`);

    return {
      Status: 'SUCCESS',
      PhysicalResourceId: userId || randomUUID(),
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      Data: { Password: adminPassword },
    };
  } catch (error) {
    console.error('Seed failed:', error);
    return {
      Status: 'FAILED',
      Reason: error instanceof Error ? error.message : String(error),
      PhysicalResourceId: 'seed-error',
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
    };
  }
};
