import serverlessExpress from '@vendia/serverless-express';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context, Handler } from 'aws-lambda';
import { createApp } from './server';

let cachedHandler: Handler<APIGatewayProxyEvent, any>;

function errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message } }),
  };
}

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  try {
    if (!cachedHandler) {
      const app = await createApp();
      cachedHandler = serverlessExpress({
        app,
        binarySettings: {
          contentTypes: ['text/html', 'text/css', 'application/javascript', 'image/png', 'image/svg+xml', 'font/woff2'],
        },
      }).handler;
    }

    return (await cachedHandler(event, context, undefined as any)) as APIGatewayProxyResult;
  } catch (error) {
    console.error('Lambda handler error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(500, message);
  }
};
