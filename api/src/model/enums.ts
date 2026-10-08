// Constant value sets used by the schemas (`enum: Object.values(X)`) and services.
// Stored values are kept as they were before the enums moved here, so no data migration
// is needed. Keep in sync with web/src/lib/constants.ts.

export type EnumValue<T> = T[keyof T];

export const USER_ROLES = Object.freeze({
  ADMIN: "admin",
} as const);
export type UserRole = EnumValue<typeof USER_ROLES>;

export const SPECIALIZATIONS = Object.freeze({
  CARDIOLOGY: "Cardiology",
  DERMATOLOGY: "Dermatology",
  ENDOCRINOLOGY: "Endocrinology",
  GASTROENTEROLOGY: "Gastroenterology",
  GENERAL_PRACTICE: "General Practice",
  NEUROLOGY: "Neurology",
  OBSTETRICS_GYNECOLOGY: "Obstetrics & Gynecology",
  ONCOLOGY: "Oncology",
  OPHTHALMOLOGY: "Ophthalmology",
  ORTHOPEDICS: "Orthopedics",
  PEDIATRICS: "Pediatrics",
  PSYCHIATRY: "Psychiatry",
  PULMONOLOGY: "Pulmonology",
  RADIOLOGY: "Radiology",
  UROLOGY: "Urology",
} as const);
export type Specialization = EnumValue<typeof SPECIALIZATIONS>;

export const GENDERS = Object.freeze({
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
} as const);
export type Gender = EnumValue<typeof GENDERS>;

export const CONDITIONS = Object.freeze({
  DIABETES: "diabetes",
  HYPERTENSION: "hypertension",
  ASTHMA: "asthma",
  CARDIAC: "cardiac",
  RESPIRATORY: "respiratory",
  OTHER: "other",
} as const);
export type Condition = EnumValue<typeof CONDITIONS>;

export const PATIENT_STATUSES = Object.freeze({
  ADMITTED: "admitted",
  UNDER_TREATMENT: "under_treatment",
  RECOVERED: "recovered",
} as const);
export type PatientStatus = EnumValue<typeof PATIENT_STATUSES>;

export const ADMISSION_INTERVALS = Object.freeze({
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
} as const);
export type AdmissionInterval = EnumValue<typeof ADMISSION_INTERVALS>;
