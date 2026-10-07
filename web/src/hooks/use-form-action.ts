import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import type { FieldErrors } from '@/components/forms/form-fields';
import type { ActionResult } from '@/types/api';

/**
 * Submits a form to a Server Action from an event handler (the documented pattern
 * for actions that need client-side logic): validates on the client first for instant
 * feedback, the action re-validates on the server, and server field errors are shown inline.
 * Unlike `<form action>`, this keeps the user's input when there are errors.
 */
export function useFormAction<Schema extends z.ZodType>({
  schema,
  action,
  onSuccess,
}: {
  schema: Schema;
  action: (input: z.output<Schema>) => Promise<ActionResult>;
  onSuccess?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();

  function reset() {
    setFieldErrors({});
    setFormError(undefined);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = schema.safeParse(values);

    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors as FieldErrors);
      setFormError(undefined);
      return;
    }

    reset();
    startTransition(async () => {
      const result = await action(parsed.data);
      if (result.ok) {
        toast.success(result.message);
        onSuccess?.();
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.message);
      }
    });
  }

  return { onSubmit, pending, fieldErrors, formError, reset };
}
