'use client';

import { Loader2 } from 'lucide-react';
import { useId, useState } from 'react';
import { saveDoctor } from '@/actions/doctors';
import { FormAlert, SelectField, TextField } from '@/components/forms/form-fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { useFormAction } from '@/hooks/use-form-action';
import { SPECIALIZATIONS } from '@/lib/constants';
import { doctorFormSchema } from '@/lib/validations/doctor';
import type { Doctor } from '@/types/doctor';

const SPECIALIZATION_OPTIONS = SPECIALIZATIONS.map((value) => ({ value, label: value }));

/** Create (no `doctor`) or edit a doctor. */
export function DoctorFormDialog({
  doctor,
  trigger,
}: {
  doctor?: Doctor;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const formId = useId();
  const isEdit = !!doctor;

  const { onSubmit, pending, fieldErrors, formError, reset } = useFormAction({
    schema: doctorFormSchema,
    action: (input) => saveDoctor(doctor?._id ?? null, input),
    onSuccess: () => setOpen(false),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit doctor' : 'Add doctor'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the doctor’s details.'
              : 'Register a new doctor. All fields are required.'}
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <FormAlert message={formError} />
            <TextField
              idPrefix={formId}
              name="name"
              label="Full name"
              defaultValue={doctor?.name}
              placeholder="Dr. Jane Doe"
              autoComplete="off"
              errors={fieldErrors}
              required
            />
            <SelectField
              idPrefix={formId}
              name="specialization"
              label="Specialization"
              options={SPECIALIZATION_OPTIONS}
              defaultValue={doctor?.specialization}
              placeholder="Select a specialization"
              errors={fieldErrors}
            />
            <TextField
              idPrefix={formId}
              name="hospital"
              label="Hospital"
              defaultValue={doctor?.hospital}
              placeholder="City General Hospital"
              errors={fieldErrors}
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                idPrefix={formId}
                name="phone"
                label="Phone"
                type="tel"
                defaultValue={doctor?.phone}
                placeholder="+1 555 0100"
                errors={fieldErrors}
                required
              />
              <TextField
                idPrefix={formId}
                name="email"
                label="Email"
                type="email"
                defaultValue={doctor?.email}
                placeholder="jane.doe@hospital.org"
                errors={fieldErrors}
                required
              />
            </div>
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form={formId} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {isEdit ? 'Save changes' : 'Add doctor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
