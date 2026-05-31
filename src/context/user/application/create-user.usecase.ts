import type { CircuitBreaker } from '../../../shared/infrastructure/circuit-breaker';
import { PasswordService } from '../../../shared/infrastructure/crypto/password.service';
import type { UnitOfWork } from '../../../shared/infrastructure/database/unit-of-work';
import { NotificationService } from '../../../shared/infrastructure/mail/notification.service';
import { SesAdapter } from '../../../shared/infrastructure/mail/ses.adapter';
import { UserEmail } from '../domain/email.vo';
import type { User } from '../domain/user.entity';
import { UserService } from '../domain/user.service';
import { UserRepository } from '../infrastructure/user.repository.impl';
import type { CreateUserDto } from './dtos/create-user.dto';

export class CreateUserUseCase {
  private readonly userService = new UserService();
  private readonly passwordService = new PasswordService();
  private readonly notificationService = new NotificationService(new SesAdapter());

  constructor(
    private readonly uow: UnitOfWork,
    private readonly sesBreaker?: CircuitBreaker,
  ) {}

  async execute(dto: CreateUserDto): Promise<User> {
    const email = UserEmail.create(dto.email);
    const hashedPassword = await this.passwordService.hash(dto.password);

    const user = await this.uow.execute(async (uow) => {
      const repo = uow.getRepository(UserRepository);
      await this.userService.ensureEmailIsUnique(email.toString(), repo);
      const saved = await repo.create({ name: dto.name, email: email.toString(), password: hashedPassword });
      return {
        id: saved.id,
        email: UserEmail.create(saved.email).toString(),
        name: saved.name,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      };
    });

    const sendEmail = () =>
      this.notificationService.sendWelcomeEmail(user).catch((err) => {
        console.error('Failed to send welcome email:', err);
      });

    if (this.sesBreaker) this.sesBreaker.execute(sendEmail);
    else sendEmail();

    return user;
  }
}
