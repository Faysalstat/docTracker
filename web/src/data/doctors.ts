import 'server-only';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { DoctorListParams, PatientListParams } from '@/lib/search-params';
import { isObjectId } from '@/lib/validations/common';
import type { DoctorFormInput } from '@/lib/validations/doctor';
import type { PatientFormInput } from '@/lib/validations/patient';
import type { Paginated } from '@/types/api';
import type { Doctor } from '@/types/doctor';
import type { Patient } from '@/types/patient';
import { ApiRequestError, apiFetch } from './api-client';
import { verifySession } from './auth';

export async function getDoctors(params: DoctorListParams) {
  const { token } = await verifySession();
  return apiFetch<Paginated<Doctor>>('/doctors', { token, query: params });
}

/**
 * Returns the doctor, or renders the not-found page for unknown/malformed ids.
 * Memoized per request: the profile and the patients section share one API call.
 */
export const getDoctor = cache(async (id: string) => {
  if (!isObjectId(id)) notFound();
  const { token } = await verifySession();
  try {
    return await apiFetch<Doctor>(`/doctors/${id}`, { token });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) notFound();
    throw error;
  }
});

export async function getDoctorPatients(id: string, params: PatientListParams) {
  const { token } = await verifySession();
  // The doctor comes from the path; undefined query values are omitted.
  const query = { ...params, doctorId: undefined };
  return apiFetch<Paginated<Patient>>(`/doctors/${id}/patients`, { token, query });
}

export async function getHospitals() {
  const { token } = await verifySession();
  const { data } = await apiFetch<{ data: string[] }>('/doctors/hospitals', { token });
  return data;
}

export async function createDoctor(input: DoctorFormInput) {
  const { token } = await verifySession();
  return apiFetch<Doctor>('/doctors', { method: 'POST', body: input, token });
}

export async function updateDoctor(id: string, input: DoctorFormInput) {
  const { token } = await verifySession();
  return apiFetch<Doctor>(`/doctors/${id}`, { method: 'PATCH', body: input, token });
}

export async function addPatientToDoctor(doctorId: string, input: PatientFormInput) {
  const { token } = await verifySession();
  // The doctor comes from the path; JSON.stringify drops the undefined field.
  const body = { ...input, doctorId: undefined };
  return apiFetch<Patient>(`/doctors/${doctorId}/patients`, { method: 'POST', body, token });
}
