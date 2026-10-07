import type { Condition, Gender, PatientStatus } from '@/lib/constants';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  email?: string;
  condition: Condition;
  status: PatientStatus;
  admissionDate: string;
  doctorId: string;
  doctor?: { id: string; name: string; specialization: string };
  createdAt: string;
  updatedAt: string;
}
