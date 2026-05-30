import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

export interface JwtSecretConfig {
  jwtSecret: string;
}

let cachedSecret: string | null = null;

export async function getJwtSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;

  const client = new SecretsManagerClient({});
  const secretArn = process.env.DB_SECRET_ARN;

  if (!secretArn) {
    throw new Error('DB_SECRET_ARN environment variable is not set');
  }

  const response = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const secret = JSON.parse(response.SecretString!) as JwtSecretConfig;

  if (!secret.jwtSecret) {
    throw new Error('jwtSecret not found in Secrets Manager secret');
  }

  cachedSecret = secret.jwtSecret;
  return cachedSecret;
}
