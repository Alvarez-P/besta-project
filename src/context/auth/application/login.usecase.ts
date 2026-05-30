import { JwtService } from '../../../shared/infrastructure/crypto/jwt.service';
import { getJwtSecret } from '../../../shared/infrastructure/crypto/jwt-secret';
import { PasswordService } from '../../../shared/infrastructure/crypto/password.service';
import { UnauthorizedError } from '../../../shared/infrastructure/errors/http.errors';
import { UserRepository } from '../../user/infrastructure/user.repository.impl';
import type { LoginDto } from './dtos/login.dto';

export class LoginUseCase {
  private readonly passwordService = new PasswordService();
  private readonly jwtService = new JwtService();

  async execute(dto: LoginDto): Promise<{ access_token: string }> {
    const repo = new UserRepository();
    const user = await repo.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await this.passwordService.verify(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const secret = await getJwtSecret();
    const accessToken = this.jwtService.sign({ userId: user.id, email: user.email }, secret);

    return { access_token: accessToken };
  }
}
