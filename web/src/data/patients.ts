import 'server-only';
import type { PatientListParams } from '@/lib/search-params';
import type { PatientFormInput } from '@/lib/validations/patient';
import type { ApiList } from '@/types/api';
import type { Patient } from '@/types/patient';
import { apiFetch } from './api-client';
import { verifySession } from './auth';
import { toOffsetQuery, toPaginated } from './pagination';

export async function getPatients(params: PatientListParams) {
  const { token } = await verifySession();
  const list = await apiFetch<ApiList<Patient>>('/patient/list', {
    token,
    query: toOffsetQuery(params),
  });
  return toPaginated(list, params.page, params.limit);
}

export async function createPatient(input: PatientFormInput & { doctorId: string }) {
  const { token } = await verifySession();
  return apiFetch<Patient>('/patient/create', { method: 'POST', body: input, token });
}

export async function updatePatient(id: string, input: PatientFormInput) {
  const { token } = await verifySession();
  return apiFetch<Patient>(`/patient/update/${id}`, { method: 'PUT', body: input, token });
}

export async function deletePatient(id: string) {
  const { token } = await verifySession();
  await apiFetch<{ _id: string }>(`/patient/delete/${id}`, { method: 'DELETE', token });
}
