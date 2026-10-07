import type { Condition } from '@/lib/constants';

export interface StatsSummary {
  totalDoctors: number;
  totalPatients: number;
  avgPatientsPerDoctor: number;
  currentlyAdmitted: number;
  admissions: number;
  /** null for "all time" (no previous period). */
  previousAdmissions: number | null;
  range: { from: string | null; to: string | null };
  previousRange: { from: string; to: string } | null;
}

export interface DoctorPatientCount {
  doctorId: string;
  name: string;
  specialization: string;
  count: number;
}

export type AdmissionInterval = 'day' | 'week' | 'month';

export interface AdmissionsSeries {
  interval: AdmissionInterval;
  /** `partial`: the bucket has not ended yet (e.g. this month so far). */
  data: { date: string; count: number; partial?: boolean }[];
}

export interface ConditionCount {
  condition: Condition;
  count: number;
}
