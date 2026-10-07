'use server';

import { refresh } from 'next/cache';
import { apiErrorResult, validationFailed } from '@/data/action-result';
import { createPatient, deletePatient, updatePatient } from '@/data/patients';
import { isObjectId } from '@/lib/validations/common';
import { patientFormSchema, patientWithDoctorSchema } from '@/lib/validations/patient';
import type { ActionResult } from '@/types/api';

export async function addPatientWithDoctor(input: unknown): Promise<ActionResult> {
  const parsed = patientWithDoctorSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);

  try {
    await createPatient(parsed.data);
  } catch (error) {
    return apiErrorResult(error);
  }

  refresh();
  return { ok: true, message: 'Patient added' };
}

export async function savePatient(patientId: string, input: unknown): Promise<ActionResult> {
  if (!isObjectId(patientId)) return { ok: false, message: 'Invalid patient' };

  const parsed = patientFormSchema.safeParse(input);
  if (!parsed.success) return validationFailed(parsed.error);

  try {
    await updatePatient(patientId, parsed.data);
  } catch (error) {
    return apiErrorResult(error);
  }

  refresh();
  return { ok: true, message: 'Patient updated' };
}

export async function removePatient(patientId: string): Promise<ActionResult> {
  if (!isObjectId(patientId)) return { ok: false, message: 'Invalid patient' };

  try {
    await deletePatient(patientId);
  } catch (error) {
    return apiErrorResult(error);
  }

  refresh();
  return { ok: true, message: 'Patient deleted' };
}
