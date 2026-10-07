'use client';

import { Loader2 } from 'lucide-react';
import { useId, useState } from 'react';
import { addPatient } from '@/actions/doctors';
import { addPatientWithDoctor, savePatient } from '@/actions/patients';
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
import { CONDITION_LABELS, GENDER_LABELS, STATUS_LABELS, toOptions } from '@/lib/constants';
import { todayIso } from '@/lib/format';
import {
  type PatientFormInput,
  patientFormSchema,
  patientWithDoctorSchema,
} from '@/lib/validations/patient';
import type { ActionResult } from '@/types/api';
import type { Patient } from '@/types/patient';

const GENDER_OPTIONS = toOptions(GENDER_LABELS);
const CONDITION_OPTIONS = toOptions(CONDITION_LABELS);
const STATUS_OPTIONS = toOptions(STATUS_LABELS);

type DoctorOption = { value: string; label: string };

type PatientFormDialogProps = { trigger: React.ReactNode } &
  /** Patients page: the doctor is chosen in the form. */
  (
    | { mode: 'create'; doctorOptions: DoctorOption[] }
    /** Doctor page: the doctor is fixed. */
    | { mode: 'add-to-doctor'; doctorId: string; doctorName: string }
    /** Edit; with `doctorOptions` the patient can be reassigned to another doctor. */
    | { mode: 'edit'; patient: Patient; doctorOptions?: DoctorOption[] }
  );

function submitPatient(
  props: PatientFormDialogProps,
  input: PatientFormInput,
): Promise<ActionResult> {
  switch (props.mode) {
    case 'create':
      return addPatientWithDoctor(input);
    case 'add-to-doctor':
      return addPatient(props.doctorId, input);
    case 'edit':
      return savePatient(props.patient.id, input);
  }
}

const DESCRIPTIONS = {
  create: 'Register a new patient and assign a doctor.',
  edit: 'Update the patient’s details.',
} as const;

export function PatientFormDialog(props: PatientFormDialogProps) {
  const { trigger, mode } = props;
  const [open, setOpen] = useState(false);
  const formId = useId();
  const patient = mode === 'edit' ? props.patient : undefined;
  const doctorOptions = mode === 'add-to-doctor' ? undefined : props.doctorOptions;

  const { onSubmit, pending, fieldErrors, formError, reset } = useFormAction({
    schema: mode === 'create' ? patientWithDoctorSchema : patientFormSchema,
    action: (input) => submitPatient(props, input),
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit patient' : 'Add patient'}</DialogTitle>
          <DialogDescription>
            {mode === 'add-to-doctor'
              ? `Register a new patient under ${props.doctorName}.`
              : DESCRIPTIONS[mode]}
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <FormAlert message={formError} />
            <TextField
              idPrefix={formId}
              name="name"
              label="Full name"
              defaultValue={patient?.name}
              autoComplete="off"
              errors={fieldErrors}
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                idPrefix={formId}
                name="age"
                label="Age"
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                defaultValue={patient?.age}
                errors={fieldErrors}
                required
              />
              <SelectField
                idPrefix={formId}
                name="gender"
                label="Gender"
                options={GENDER_OPTIONS}
                defaultValue={patient?.gender}
                errors={fieldErrors}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                idPrefix={formId}
                name="phone"
                label="Phone"
                type="tel"
                defaultValue={patient?.phone}
                errors={fieldErrors}
                required
              />
              <TextField
                idPrefix={formId}
                name="email"
                label="Email (optional)"
                type="email"
                defaultValue={patient?.email}
                errors={fieldErrors}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                idPrefix={formId}
                name="condition"
                label="Condition"
                options={CONDITION_OPTIONS}
                defaultValue={patient?.condition}
                errors={fieldErrors}
              />
              <SelectField
                idPrefix={formId}
                name="status"
                label="Status"
                options={STATUS_OPTIONS}
                defaultValue={patient?.status ?? 'admitted'}
                errors={fieldErrors}
              />
            </div>
            <TextField
              idPrefix={formId}
              name="admissionDate"
              label="Admission date"
              type="date"
              max={todayIso()}
              defaultValue={patient ? patient.admissionDate.slice(0, 10) : todayIso()}
              errors={fieldErrors}
              required
            />
            {doctorOptions && (
              <SelectField
                idPrefix={formId}
                name="doctorId"
                label="Doctor"
                options={doctorOptions}
                defaultValue={patient?.doctorId}
                placeholder="Select a doctor"
                errors={fieldErrors}
              />
            )}
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
            {mode === 'edit' ? 'Save changes' : 'Add patient'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
