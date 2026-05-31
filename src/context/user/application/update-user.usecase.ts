import type { CircuitBreaker } from '../../../shared/infrastructure/circuit-breaker';
import { PasswordService } from '../../../shared/infrastructure/crypto/password.service';
import type { UnitOfWork } from '../../../shared/infrastructure/database/unit-of-work';
import { NotFoundError } from '../../../shared/infrastructure/errors/http.errors';
import { NotificationService } from '../../../shared/infrastructure/mail/notification.service';
import { SesAdapter } from '../../../shared/infrastructure/mail/ses.adapter';
import { UserEmail } from '../domain/email.vo';
import type { User } from '../domain/user.entity';
import { UserService } from '../domain/user.service';
import { UserRepository } from '../infrastructure/user.repository.impl';
import type { UpdateUserDto } from './dtos/update-user.dto';

export class UpdateUserUseCase {
  private readonly userService = new UserService();
  private readonly passwordService = new PasswordService();
  private readonly notificationService = new NotificationService(new SesAdapter());

  constructor(
    private readonly uow: UnitOfWork,
    private readonly sesBreaker?: CircuitBreaker,
  ) {}

  async execute(id: string, dto: UpdateUserDto): Promise<User> {
    return this.uow.execute(async (uow) => {
      const repo = uow.getRepository(UserRepository);

      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw new NotFoundError(`User with id "${id}" not found`);
      }
      let emailChanged = false;
      if (dto.email) {
        const normalizedEmail = dto.email.trim().toLowerCase();
        if (normalizedEmail !== existing.email) {
          await this.userService.ensureEmailIsUnique(normalizedEmail, repo);
          emailChanged = true;
        }
      }

      const updateData: Record<string, unknown> = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.email) updateData.email = dto.email;
      if (dto.password) updateData.password = await this.passwordService.hash(dto.password);

      if (Object.keys(updateData).length > 0) {
        await repo.update(
          updateData as any,
          {
            where: { id },
            returning: true,
          } as any,
        );
      }

      const updated = await repo.findOne({ where: { id } });

      if (emailChanged) {
        const sendEmail = () => this.notificationService.sendUpdateEmail(updated!);

        if (this.sesBreaker) {
          this.sesBreaker.execute(sendEmail).catch((err) => {
            console.error('Failed to send update email:', err);
          });
        } else {
          sendEmail().catch((err) => {
            console.error('Failed to send update email:', err);
          });
        }
      }

      return {
        id: updated!.id,
        email: UserEmail.create(updated!.email).toString(),
        name: updated!.name,
        createdAt: updated!.createdAt,
        updatedAt: updated!.updatedAt,
      };
    });
  }
}
