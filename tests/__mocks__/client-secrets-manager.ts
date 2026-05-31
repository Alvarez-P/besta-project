export const SecretsManagerClient = jest.fn().mockImplementation(() => ({
  send: jest.fn().mockResolvedValue({
    SecretString: JSON.stringify({
      engine: 'mysql',
      username: 'test',
      password: 'test',
      host: 'localhost',
      port: 3306,
      dbname: 'test_db',
    }),
  }),
}));

export const GetSecretValueCommand = jest.fn();
