import serverlessExpress from '@vendia/serverless-express';
import type { APIGatewayProxyEvent, Context, Handler } from 'aws-lambda';
import { createApp } from './server';

let cachedHandler: Handler<APIGatewayProxyEvent, any>;

export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  if (!cachedHandler) {
    const app = await createApp();
    cachedHandler = serverlessExpress({
      app,
      binarySettings: {
        contentTypes: ['text/html', 'text/css', 'application/javascript', 'image/png', 'image/svg+xml', 'font/woff2'],
      },
    }).handler;
  }

  return cachedHandler(event, context, undefined as any);
};
