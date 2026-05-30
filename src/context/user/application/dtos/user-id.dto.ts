import { z } from 'zod';

export const userIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
