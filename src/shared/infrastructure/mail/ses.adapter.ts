import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { Email } from './email.entity';

export class SesAdapter {
  private client: SESClient;

  constructor() {
    this.client = new SESClient({});
  }

  async sendEmail(email: Email): Promise<string> {
    const fromEmail = process.env.SES_FROM_EMAIL;

    if (!fromEmail) {
      throw new Error('SES_FROM_EMAIL environment variable is not configured');
    }

    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [email.to],
      },
      Message: {
        Subject: {
          Data: email.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: email.body,
            Charset: 'UTF-8',
          },
        },
      },
    });

    const result = await this.client.send(command);
    return result.MessageId ?? '';
  }
}
