import type { Request } from "express";
import { z } from "zod";
import * as db from "../connector/db-connector";
import Doctor from "../model/doctor";
import { CONDITIONS, GENDERS, PATIENT_STATUSES } from "../model/enums";
import Patient from "../model/patient";
import {
  buildSearchFilter,
  dateRangeFields,
  optionalParam,
  paginationFields,
  refineDateRange,
  searchParam,
  sortParam,
  toDateRangeFilter,
} from "../utils/query";
import {
  assertHasFields,
  emailSchema,
  isoDateSchema,
  objectIdSchema,
  parseInput,
  personNameSchema,
  phoneSchema,
  toReadableError,
} from "../utils/validate";

// Populated in place of the stored id on every patient response.
const DOCTOR_SUMMARY_FIELDS = "name specialization";

const admissionDateSchema = isoDateSchema
  .refine((value) => value <= new Date().toISOString().slice(0, 10), "cannot be in the future")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const patientFieldsSchema = z.object({
  name: personNameSchema,
  // Accepts 42 or "42" (form posts may send numbers as strings).
  age: z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
    z
      .number()
      .int("must be a whole number")
      .min(0, "must be 0 or more")
      .max(120, "must be 120 or less"),
  ),
  gender: z.enum(GENDERS),
  phone: phoneSchema,
  email: optionalParam(emailSchema),
  condition: z.enum(CONDITIONS),
  status: z.enum(PATIENT_STATUSES),
  admissionDate: admissionDateSchema,
  doctorId: objectIdSchema,
});

const createSchema = patientFieldsSchema.extend({
  status: z.enum(PATIENT_STATUSES).default(PATIENT_STATUSES.ADMITTED),
});

const listQuerySchema = z
  .object({
    ...paginationFields,
    q: searchParam,
    condition: optionalParam(z.enum(CONDITIONS)),
    status: optionalParam(z.enum(PATIENT_STATUSES)),
    gender: optionalParam(z.enum(GENDERS)),
    doctorId: optionalParam(objectIdSchema),
    ...dateRangeFields,
    sort: sortParam(
      { name: "nameLower", admissionDate: "admissionDate", age: "age" },
      "-admissionDate",
    ),
  })
  .superRefine(refineDateRange);

async function assertDoctorExists(doctorId: string) {
  const exists = await Doctor.exists({ _id: doctorId });
  if (!exists) {
    throw new Error("Doctor not found");
  }
}

export const listPatients = async (req: Request) => {
  const params = parseInput(listQuerySchema, req.query);

  const query: Record<string, unknown> = {};
  if (params.doctorId) {
    // "Doctor not found" instead of an empty list for an unknown doctor.
    await assertDoctorExists(params.doctorId);
    query.doctorId = params.doctorId;
  }
  if (params.condition) query.condition = params.condition;
  if (params.status) query.status = params.status;
  if (params.gender) query.gender = params.gender;
  const admissionDate = toDateRangeFilter(params);
  if (admissionDate) query.admissionDate = admissionDate;
  if (params.q) query.$or = buildSearchFilter(params.q);

  const [data, length] = await Promise.all([
    Patient.find(query)
      .sort(params.sort)
      .skip(params.offset)
      .limit(params.limit)
      .populate("doctorId", DOCTOR_SUMMARY_FIELDS)
      .lean(),
    Patient.countDocuments(query),
  ]);
  return { data, length };
};

export const getPatientById = async (req: Request) => {
  const patientId = req.query.id;
  db.assertObjectId(patientId, "patientId");

  const patient = await Patient.findOne({ _id: patientId })
    .populate("doctorId", DOCTOR_SUMMARY_FIELDS)
    .lean();
  if (!patient) {
    throw new Error("Patient not found");
  }
  return patient;
};

export const createPatient = async (req: Request) => {
  if (!req.isAdmin) {
    throw new Error("Only an admin can create patients");
  }
  const payload = parseInput(createSchema, req.body);
  await assertDoctorExists(payload.doctorId);

  const patient = {
    name: payload.name,
    nameLower: payload.name.toLowerCase(),
    age: payload.age,
    gender: payload.gender,
    phone: payload.phone,
    email: payload.email,
    condition: payload.condition,
    status: payload.status,
    admissionDate: payload.admissionDate,
    doctorId: payload.doctorId,
  };

  let created;
  try {
    created = await Patient.create(patient);
  } catch (error) {
    throw toReadableError(error);
  }
  return Patient.findOne({ _id: created._id }).populate("doctorId", DOCTOR_SUMMARY_FIELDS).lean();
};

export const updatePatient = async (req: Request) => {
  if (!req.isAdmin) {
    throw new Error("Only an admin can update patients");
  }
  const patientId = req.params.id;
  db.assertObjectId(patientId, "patientId");
  const payload = parseInput(patientFieldsSchema.partial(), req.body);
  assertHasFields(payload);
  if (payload.doctorId) {
    await assertDoctorExists(payload.doctorId);
  }

  // Only the fields that were sent are changed.
  const changes: Record<string, unknown> = {};
  if (payload.name !== undefined) {
    changes.name = payload.name;
    changes.nameLower = payload.name.toLowerCase();
  }
  if (payload.age !== undefined) changes.age = payload.age;
  if (payload.gender !== undefined) changes.gender = payload.gender;
  if (payload.phone !== undefined) changes.phone = payload.phone;
  if (payload.email !== undefined) changes.email = payload.email;
  if (payload.condition !== undefined) changes.condition = payload.condition;
  if (payload.status !== undefined) changes.status = payload.status;
  if (payload.admissionDate !== undefined) changes.admissionDate = payload.admissionDate;
  if (payload.doctorId !== undefined) changes.doctorId = payload.doctorId;

  let patient;
  try {
    patient = await Patient.findOneAndUpdate(
      { _id: patientId },
      { $set: changes },
      { returnDocument: "after", runValidators: true },
    )
      .populate("doctorId", DOCTOR_SUMMARY_FIELDS)
      .lean();
  } catch (error) {
    throw toReadableError(error);
  }
  if (!patient) {
    throw new Error("Patient not found");
  }
  return patient;
};

export const deletePatient = async (req: Request) => {
  if (!req.isAdmin) {
    throw new Error("Only an admin can delete patients");
  }
  const patientId = req.params.id;
  db.assertObjectId(patientId, "patientId");

  const deleted = await Patient.findOneAndDelete({ _id: patientId }).select("_id").lean();
  if (!deleted) {
    throw new Error("Patient not found");
  }
  return { _id: deleted._id };
};
