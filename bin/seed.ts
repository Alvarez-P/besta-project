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

    const id = randomUUID();

    await conn.execute(
      'INSERT IGNORE INTO users (id, name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [id, adminName, adminEmail, hashed],
    );

    await conn.end();

    console.log(`Admin user created: ${adminEmail} (id: ${id})`);

    return {
      Status: 'SUCCESS',
      PhysicalResourceId: id,
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
