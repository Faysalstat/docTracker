import type { Condition, Gender, PatientStatus } from '@/lib/constants';

/** The patient's doctor, populated by the API in place of the stored id. */
export interface PatientDoctor {
  _id: string;
  name: string;
  specialization: string;
}

export interface Patient {
  _id: string;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  email?: string;
  condition: Condition;
  status: PatientStatus;
  admissionDate: string;
  /** null only if the doctor record has been removed. */
  doctorId: PatientDoctor | null;
  createdAt: string;
  updatedAt: string;
}
