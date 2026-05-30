import { z } from 'zod';

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    email: z
      .string()
      .min(1)
      .max(255)
      .refine((val) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim()), {
        message: 'Invalid email format',
      })
      .optional(),
    password: z.string().min(8).max(128).optional(),
  }),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>['body'];
