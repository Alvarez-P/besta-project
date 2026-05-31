import type { Router } from 'express';
import type { CircuitBreaker } from '../../../shared/infrastructure/circuit-breaker';
import type { UnitOfWork } from '../../../shared/infrastructure/database/unit-of-work';
import { authGuard } from '../../../shared/infrastructure/middleware/auth-guard';
import { validate } from '../../../shared/infrastructure/middleware/validate';
import { paginated, success } from '../../../shared/infrastructure/response';
import { CreateUserUseCase } from '../application/create-user.usecase';
import { DeleteUserUseCase } from '../application/delete-user.usecase';
import { createUserSchema } from '../application/dtos/create-user.dto';
import { queryUserSchema } from '../application/dtos/query-user.dto';
import { updateUserSchema } from '../application/dtos/update-user.dto';
import { userIdSchema } from '../application/dtos/user-id.dto';
import { GetUserByIdUseCase } from '../application/get-user-by-id.usecase';
import { GetUsersUseCase } from '../application/get-users.usecase';
import { UpdateUserUseCase } from '../application/update-user.usecase';

export function registerUserRoutes(app: Router, uow: UnitOfWork, sesBreaker?: CircuitBreaker): void {
  const createUserUseCase = new CreateUserUseCase(uow, sesBreaker);
  const getUsersUseCase = new GetUsersUseCase();
  const getUserByIdUseCase = new GetUserByIdUseCase();
  const updateUserUseCase = new UpdateUserUseCase(uow, sesBreaker);
  const deleteUserUseCase = new DeleteUserUseCase(uow);

  app.post('/users', validate(createUserSchema), async (req, res, next) => {
    try {
      const user = await createUserUseCase.execute(req.body);
      success(res, user, 201);
    } catch (error) {
      next(error);
    }
  });

  app.get('/users', authGuard, validate(queryUserSchema), async (req, res, next) => {
    try {
      const result = await getUsersUseCase.execute(req.query as any);
      paginated(res, result.data, result.meta);
    } catch (error) {
      next(error);
    }
  });

  app.get('/users/:id', authGuard, validate(userIdSchema), async (req, res, next) => {
    try {
      const user = await getUserByIdUseCase.execute(req.params.id as string);
      success(res, user);
    } catch (error) {
      next(error);
    }
  });

  app.put('/users/:id', authGuard, validate(updateUserSchema), async (req, res, next) => {
    try {
      const user = await updateUserUseCase.execute(req.params.id as string, req.body);
      success(res, user);
    } catch (error) {
      next(error);
    }
  });

  app.delete('/users/:id', authGuard, validate(userIdSchema), async (req, res, next) => {
    try {
      await deleteUserUseCase.execute(req.params.id as string);
      success(res, undefined, 204);
    } catch (error) {
      next(error);
    }
  });
}
