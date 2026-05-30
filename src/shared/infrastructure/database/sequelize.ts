import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { Sequelize } from 'sequelize';
import { initUserModel } from '../../../context/user/infrastructure/user.model';

let sequelize: Sequelize | null = null;

export function getSequelizeInstance(): Sequelize | null {
  return sequelize;
}

export async function initSequelize(): Promise<Sequelize> {
  if (sequelize) return sequelize;

  const client = new SecretsManagerClient({});
  const secretArn = process.env.DB_SECRET_ARN;

  if (!secretArn) {
    throw new Error('DB_SECRET_ARN environment variable is not set');
  }

  const response = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const secret = JSON.parse(response.SecretString!);

  sequelize = new Sequelize({
    database: process.env.DB_NAME!,
    username: secret.username,
    password: secret.password,
    host: secret.host,
    port: parseInt(secret.port, 10),
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });

  initUserModel(sequelize);

  await sequelize.authenticate();

  await sequelize.sync({ alter: true });

  return sequelize;
}
