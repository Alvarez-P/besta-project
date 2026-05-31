/// <reference types="jest" />

process.env.DB_NAME = 'test_db';
process.env.DB_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-db-secret';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.SES_FROM_EMAIL = 'test@example.com';
process.env.NODE_ENV = 'test';

jest.mock('@aws-sdk/client-secrets-manager', () => {
  return require('./__mocks__/client-secrets-manager');
});

jest.mock('@aws-sdk/client-ses', () => {
  return require('./__mocks__/client-ses');
});

jest.mock('@aws-sdk/client-dynamodb', () => {
  return require('./__mocks__/client-dynamodb');
});

jest.mock('@aws-sdk/lib-dynamodb', () => {
  return require('./__mocks__/lib-dynamodb');
});

jest.mock('../src/shared/infrastructure/crypto/jwt-secret', () => ({
  __esModule: true,
  getJwtSecret: jest.fn().mockResolvedValue('test-jwt-secret-for-unit-tests'),
}));

jest.mock('../src/shared/infrastructure/database/sequelize', () => {
  const { Sequelize } = jest.requireActual('sequelize');

  let sequelize: any = null;

  return {
    __esModule: true,
    initSequelize: jest.fn().mockImplementation(async () => {
      if (sequelize) return sequelize;

      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false,
      });

      const { initUserModel } = jest.requireActual('../src/context/user/infrastructure/user.model');
      initUserModel(sequelize);
      await sequelize.sync({ force: true });

      return sequelize;
    }),
    getSequelizeInstance: jest.fn().mockImplementation(() => sequelize),
  };
});
