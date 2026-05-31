import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

let cachedSecret: string | null = null;

export async function getJwtSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;

  const envSecret = process.env.JWT_SECRET;
  if (envSecret) {
    cachedSecret = envSecret;
    return cachedSecret;
  }

  const client = new SecretsManagerClient({});
  const jwtSecretArn = process.env.JWT_SECRET_ARN;

  if (jwtSecretArn) {
    const response = await client.send(new GetSecretValueCommand({ SecretId: jwtSecretArn }));
    return response.SecretString!;
  }

  const dbSecretArn = process.env.DB_SECRET_ARN;
  if (!dbSecretArn) {
    throw new Error('JWT_SECRET, JWT_SECRET_ARN, or DB_SECRET_ARN is required');
  }

  const response = await client.send(new GetSecretValueCommand({ SecretId: dbSecretArn }));
  const secret = JSON.parse(response.SecretString!);

  if (!secret.jwtSecret) {
    throw new Error('jwtSecret not found in Secrets Manager secret. Add it manually or set JWT_SECRET env var.');
  }

  cachedSecret = secret.jwtSecret as string;
  return cachedSecret;
}
