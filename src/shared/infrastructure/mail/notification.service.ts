import type { User } from '../../../context/user/domain/user.entity';
import type { SesAdapter } from './ses.adapter';

export class NotificationService {
  constructor(private readonly sesAdapter: SesAdapter) {}

  async sendWelcomeEmail(user: User): Promise<void> {
    const email = {
      to: user.email.toString(),
      subject: 'Welcome to Besta!',
      body: `Hi ${user.name},\n\nYour account has been created successfully.\n\nBest regards.\nBesta Team`,
    };

    await this.sesAdapter.sendEmail(email);
  }
}
