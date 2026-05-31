import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.IDEMPOTENCY_TABLE_NAME ?? 'IdempotencyTable';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export interface IdempotencyRecord {
  idempotencyKey: string;
  expiresAt: number;
  response: string;
  statusCode: number;
  method: string;
  path: string;
}

const DEFAULT_TTL_SECONDS = 1800;

export class IdempotencyRepository {
  constructor(private tableName: string = TABLE_NAME) {}

  async get(key: string): Promise<IdempotencyRecord | null> {
    const result = await client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { idempotencyKey: key },
      }),
    );

    if (!result.Item) return null;

    const record = result.Item as IdempotencyRecord;

    if (record.expiresAt < Math.floor(Date.now() / 1000)) {
      await this.delete(key).catch(() => {});
      return null;
    }

    return record;
  }

  async save(
    key: string,
    response: unknown,
    statusCode: number,
    method: string,
    path: string,
    ttlSeconds = DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          idempotencyKey: key,
          expiresAt,
          response: JSON.stringify(response),
          statusCode,
          method,
          path,
        },
      }),
    );
  }

  private async delete(key: string): Promise<void> {
    await client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { idempotencyKey: key },
      }),
    );
  }
}
