'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ApiRequestError } from '@/data/api-client';
import { signIn } from '@/data/auth';
import { deleteSession } from '@/data/session';
import { type LoginFormState, loginSchema } from '@/lib/validations/auth';

export async function login(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get('email') ?? '');
  const parsed = loginSchema.safeParse({ email, password: formData.get('password') });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: { email } };
  }

  try {
    await signIn(parsed.data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      const message =
        error.status === 401
          ? 'Invalid email or password.'
          : 'Unable to sign in. Please try again.';
      return { message, values: { email } };
    }
    throw error;
  }

  redirect('/dashboard');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
