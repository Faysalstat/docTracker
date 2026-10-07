// Domain values. Keep in sync with api/src/modules/*/[name].constants.ts.

export const SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'Gastroenterology',
  'General Practice',
  'Neurology',
  'Obstetrics & Gynecology',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Urology',
] as const;

export const GENDERS = ['male', 'female', 'other'] as const;
export const CONDITIONS = [
  'diabetes',
  'hypertension',
  'asthma',
  'cardiac',
  'respiratory',
  'other',
] as const;
export const PATIENT_STATUSES = ['admitted', 'under_treatment', 'recovered'] as const;

export type Specialization = (typeof SPECIALIZATIONS)[number];
export type Gender = (typeof GENDERS)[number];
export type Condition = (typeof CONDITIONS)[number];
export type PatientStatus = (typeof PATIENT_STATUSES)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

export const CONDITION_LABELS: Record<Condition, string> = {
  diabetes: 'Diabetes',
  hypertension: 'Hypertension',
  asthma: 'Asthma',
  cardiac: 'Cardiac',
  respiratory: 'Respiratory',
  other: 'Other',
};

export const STATUS_LABELS: Record<PatientStatus, string> = {
  admitted: 'Admitted',
  under_treatment: 'Under treatment',
  recovered: 'Recovered',
};

export const PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 20;

export const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
