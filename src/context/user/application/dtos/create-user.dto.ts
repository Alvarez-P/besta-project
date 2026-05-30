import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z
      .string()
      .min(1)
      .max(255)
      .refine((val) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim()), {
        message: 'Invalid email format',
      }),
    password: z.string().min(8).max(128),
  }),
});

export type CreateUserDto = z.infer<typeof createUserSchema>['body'];
