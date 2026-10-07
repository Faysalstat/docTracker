// Keep in sync with web/src/lib/constants.ts.
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
