'use client';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type FieldErrors = Record<string, string[] | undefined>;

const toErrors = (messages?: string[]) => messages?.map((message) => ({ message }));

interface BaseFieldProps {
  name: string;
  label: string;
  errors?: FieldErrors;
  /** Form id prefix, so ids stay unique when several forms are on the page. */
  idPrefix: string;
}

export function TextField({
  name,
  label,
  errors,
  idPrefix,
  ...inputProps
}: BaseFieldProps & Omit<React.ComponentProps<typeof Input>, 'name' | 'id'>) {
  const id = `${idPrefix}-${name}`;
  const messages = errors?.[name];
  return (
    <Field data-invalid={!!messages}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        aria-invalid={!!messages}
        aria-describedby={messages ? `${id}-error` : undefined}
        {...inputProps}
      />
      <FieldError id={`${id}-error`} errors={toErrors(messages)} />
    </Field>
  );
}

export function SelectField({
  name,
  label,
  errors,
  idPrefix,
  options,
  defaultValue,
  placeholder = 'Select…',
}: BaseFieldProps & {
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
}) {
  const id = `${idPrefix}-${name}`;
  const messages = errors?.[name];
  return (
    <Field data-invalid={!!messages}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {/* `name` makes Radix render a hidden native select, so the value is in FormData. */}
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={!!messages}
          aria-describedby={messages ? `${id}-error` : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError id={`${id}-error`} errors={toErrors(messages)} />
    </Field>
  );
}

export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
    >
      {message}
    </p>
  );
}
