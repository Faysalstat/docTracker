import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required').max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type LoginFormState =
  | {
      errors?: Partial<Record<keyof LoginInput, string[]>>;
      message?: string;
      values?: { email: string };
    }
  | undefined;
