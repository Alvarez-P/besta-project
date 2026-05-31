import { z } from 'zod';

export const queryUserSchema = z.object({
  query: z.object({
    offset: z.coerce.number().int().min(0).optional(),
    limit: z.coerce.number().int().min(1).optional(),
    name: z.string().optional(),
  }),
});

export type QueryUserDto = z.infer<typeof queryUserSchema>['query'];
