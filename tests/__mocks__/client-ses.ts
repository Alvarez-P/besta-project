export const SESClient = jest.fn().mockImplementation(() => ({
  send: jest.fn().mockResolvedValue({ MessageId: 'mock-message-id' }),
}));

export const SendEmailCommand = jest.fn();
