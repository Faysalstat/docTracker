import 'server-only';
import type { PatientFormInput } from '@/lib/validations/patient';
import type { Patient } from '@/types/patient';
import { apiFetch } from './api-client';
import { verifySession } from './auth';

export async function updatePatient(id: string, input: PatientFormInput) {
  const { token } = await verifySession();
  return apiFetch<Patient>(`/patients/${id}`, { method: 'PATCH', body: input, token });
}

export async function deletePatient(id: string) {
  const { token } = await verifySession();
  await apiFetch<void>(`/patients/${id}`, { method: 'DELETE', token });
}
