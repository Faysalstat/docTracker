'use client';

import { Loader2 } from 'lucide-react';
import { useActionState } from 'react';
import { login } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const toFieldErrors = (messages?: string[]) => messages?.map((message) => ({ message }));

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const emailErrors = state?.errors?.email;
  const passwordErrors = state?.errors?.password;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>Use your admin account to access the portal.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate>
          <FieldGroup>
            {state?.message && (
              <p
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
              >
                {state.message}
              </p>
            )}

            <Field data-invalid={!!emailErrors}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                defaultValue={state?.values?.email}
                aria-invalid={!!emailErrors}
                aria-describedby={emailErrors ? 'email-error' : undefined}
                required
                autoFocus
              />
              <FieldError id="email-error" errors={toFieldErrors(emailErrors)} />
            </Field>

            <Field data-invalid={!!passwordErrors}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!passwordErrors}
                aria-describedby={passwordErrors ? 'password-error' : undefined}
                required
              />
              <FieldError id="password-error" errors={toFieldErrors(passwordErrors)} />
            </Field>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {pending ? 'Signing in…' : 'Sign in'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
