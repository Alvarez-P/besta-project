const store = new Map<string, Record<string, unknown>>();

const send = jest.fn().mockImplementation((command: { name: string; input: Record<string, unknown> }) => {
  if (command.name === 'GetCommand') {
    const key = (command.input.Key as Record<string, string>)?.idempotencyKey;
    const item = store.get(key);
    return Promise.resolve(item ? { Item: item } : {});
  }
  if (command.name === 'PutCommand') {
    const item = command.input.Item as Record<string, unknown>;
    const key = (item.idempotencyKey as string) ?? '';
    store.set(key, item);
    return Promise.resolve({});
  }
  if (command.name === 'DeleteCommand') {
    const key = (command.input.Key as Record<string, string>)?.idempotencyKey;
    store.delete(key);
    return Promise.resolve({});
  }
  return Promise.resolve({});
});

export const DynamoDBDocumentClient = {
  from: jest.fn().mockReturnValue({ send }),
};

export const GetCommand = jest.fn().mockImplementation((input: unknown) => ({
  name: 'GetCommand',
  input,
}));

export const PutCommand = jest.fn().mockImplementation((input: unknown) => ({
  name: 'PutCommand',
  input,
}));

export const DeleteCommand = jest.fn().mockImplementation((input: unknown) => ({
  name: 'DeleteCommand',
  input,
}));
