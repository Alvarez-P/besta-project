import type { Router } from 'express';
import { validate } from '../../../shared/infrastructure/middleware/validate';
import { success } from '../../../shared/infrastructure/response';
import { loginSchema } from '../application/dtos/login.dto';
import { LoginUseCase } from '../application/login.usecase';

export function registerAuthRoutes(app: Router): void {
  const loginUseCase = new LoginUseCase();

  app.post('/auth/login', validate(loginSchema), async (req, res, next) => {
    try {
      const result = await loginUseCase.execute(req.body);
      success(res, result);
    } catch (error) {
      next(error);
    }
  });
}
