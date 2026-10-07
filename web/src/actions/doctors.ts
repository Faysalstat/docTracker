'use server';

import { refresh } from 'next/cache';
import { apiErrorResult, validationFailed } from '@/data/action-result';
import { addPatientToDoctor, createDoctor, updateDoctor } from '@/data/doctors';
import { isObjectId } from '@/lib/validations/common';
import { doctorFormSchema } from '@/lib/validations/doctor';
import { patientFormSchema } from '@/lib/validations/patient';
import type { ActionResult } from '@/types/api';

const EMAIL_TAKEN = { field: 'email', message: 'A doctor with this email already exists' };

/** Creates a doctor (`doctorId` null) or updates an existing one. */
export async function saveDoctor(doctorId: string | null, input: unknown): Promise<ActionResult> {
  if (doctorId !== null && !isObjectId(doctorId)) return { ok: false, message: 'Invalid doctor' };

  const parsed = doctorFormSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);

  try {
    if (doctorId) await updateDoctor(doctorId, parsed.data);
    else await createDoctor(parsed.data);
  } catch (error) {
    return apiErrorResult(error, EMAIL_TAKEN);
  }

  refresh();
  return { ok: true, message: doctorId ? 'Doctor updated' : 'Doctor added' };
}

export async function addPatient(doctorId: string, input: unknown): Promise<ActionResult> {
  if (!isObjectId(doctorId)) return { ok: false, message: 'Invalid doctor' };

  const parsed = patientFormSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);

  try {
    await addPatientToDoctor(doctorId, parsed.data);
  } catch (error) {
    return apiErrorResult(error);
  }

  refresh();
  return { ok: true, message: 'Patient added' };
}
