import 'server-only';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { DoctorListParams, PatientListParams } from '@/lib/search-params';
import { isObjectId } from '@/lib/validations/common';
import type { DoctorFormInput } from '@/lib/validations/doctor';
import type { PatientFormInput } from '@/lib/validations/patient';
import type { ApiList } from '@/types/api';
import type { Doctor } from '@/types/doctor';
import type { Patient } from '@/types/patient';
import { apiFetch, isNotFoundError } from './api-client';
import { verifySession } from './auth';
import { toOffsetQuery, toPaginated } from './pagination';

export async function getDoctors(params: DoctorListParams) {
  const { token } = await verifySession();
  const list = await apiFetch<ApiList<Doctor>>('/doctor/list', {
    token,
    query: toOffsetQuery(params),
  });
  return toPaginated(list, params.page, params.limit);
}

/**
 * Returns the doctor, or renders the not-found page for unknown/malformed ids.
 * Memoized per request: the profile and the patients section share one API call.
 */
export const getDoctor = cache(async (id: string) => {
  if (!isObjectId(id)) notFound();
  const { token } = await verifySession();
  try {
    return await apiFetch<Doctor>('/doctor/getbyid', { token, query: { id } });
  } catch (error) {
    if (isNotFoundError(error)) notFound();
    throw error;
  }
});

export async function getDoctorPatients(id: string, params: PatientListParams) {
  const { token } = await verifySession();
  // The doctor comes from the path, not from the (user-editable) query string.
  const list = await apiFetch<ApiList<Patient>>('/patient/list', {
    token,
    query: { ...toOffsetQuery(params), doctorId: id },
  });
  return toPaginated(list, params.page, params.limit);
}

/** _id/name pairs for doctor pickers. Memoized per request (used by several components). */
export const getDoctorOptions = cache(async () => {
  const { token } = await verifySession();
  const doctors = await apiFetch<{ _id: string; name: string }[]>('/doctor/options', { token });
  return doctors.map((doctor) => ({ value: doctor._id, label: doctor.name }));
});

export async function getHospitals() {
  const { token } = await verifySession();
  return apiFetch<string[]>('/doctor/hospitals', { token });
}

export async function createDoctor(input: DoctorFormInput) {
  const { token } = await verifySession();
  return apiFetch<Doctor>('/doctor/create', { method: 'POST', body: input, token });
}

export async function updateDoctor(id: string, input: DoctorFormInput) {
  const { token } = await verifySession();
  return apiFetch<Doctor>(`/doctor/update/${id}`, { method: 'PUT', body: input, token });
}

export async function addPatientToDoctor(doctorId: string, input: PatientFormInput) {
  const { token } = await verifySession();
  // The doctor comes from the page, not from the form.
  const body = { ...input, doctorId };
  return apiFetch<Patient>('/patient/create', { method: 'POST', body, token });
}
