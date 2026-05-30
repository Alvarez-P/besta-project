import type { UserEmail } from './email.vo';

export interface User {
  id: string;
  email: UserEmail;
  name: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}
