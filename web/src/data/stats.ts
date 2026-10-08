import 'server-only';
import type { ResolvedRange } from '@/lib/date-range';
import type {
  AdmissionsSeries,
  ConditionCount,
  DoctorPatientCount,
  StatsSummary,
} from '@/types/stats';
import { apiFetch } from './api-client';
import { verifySession } from './auth';

// All aggregation happens in MongoDB; the web app only receives small result sets.

const rangeQuery = ({ from, to }: ResolvedRange) => ({ from, to });

export async function getSummary(range: ResolvedRange) {
  const { token } = await verifySession();
  return apiFetch<StatsSummary>('/stats/summary', { token, query: rangeQuery(range) });
}

export async function getTopDoctors(range: ResolvedRange, limit = 10) {
  const { token } = await verifySession();
  return apiFetch<DoctorPatientCount[]>('/stats/patients-per-doctor', {
    token,
    query: { ...rangeQuery(range), limit },
  });
}

export async function getAdmissions(range: ResolvedRange) {
  const { token } = await verifySession();
  return apiFetch<AdmissionsSeries>('/stats/admissions', { token, query: rangeQuery(range) });
}

export async function getConditions(range: ResolvedRange) {
  const { token } = await verifySession();
  return apiFetch<ConditionCount[]>('/stats/conditions', { token, query: rangeQuery(range) });
}
