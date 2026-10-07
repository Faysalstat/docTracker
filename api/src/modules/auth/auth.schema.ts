import { z } from 'zod';
import { emailSchema } from '../../utils/validators.js';

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
