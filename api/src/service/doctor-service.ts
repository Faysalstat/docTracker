import type { Request } from "express";
import { z } from "zod";
import * as db from "../connector/db-connector";
import Doctor from "../model/doctor";
import { SPECIALIZATIONS } from "../model/enums";
import Patient from "../model/patient";
import { countPatientsByDoctor } from "../repository/patient-repo";
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
  parseInput,
  personNameSchema,
  phoneSchema,
  toReadableError,
} from "../utils/validate";

// Upper bound for picker lists; beyond this a searchable (server-side) combobox is needed.
const MAX_DOCTOR_OPTIONS = 1000;

const doctorFieldsSchema = z.object({
  name: personNameSchema,
  specialization: z.enum(SPECIALIZATIONS),
  hospital: z
    .string()
    .trim()
    .min(2, "must be at least 2 characters")
    .max(120, "must be at most 120 characters"),
  phone: phoneSchema,
  email: emailSchema,
});

const listQuerySchema = z
  .object({
    ...paginationFields,
    q: searchParam,
    specialization: optionalParam(z.enum(SPECIALIZATIONS)),
    hospital: searchParam,
    ...dateRangeFields,
    sort: sortParam({ name: "nameLower", createdAt: "createdAt" }, "-createdAt"),
  })
  .superRefine(refineDateRange);

export const listDoctors = async (req: Request) => {
  const params = parseInput(listQuerySchema, req.query);

  const query: Record<string, unknown> = {};
  if (params.specialization) query.specialization = params.specialization;
  if (params.hospital) query.hospital = params.hospital;
  const createdAt = toDateRangeFilter(params);
  if (createdAt) query.createdAt = createdAt;
  if (params.q) query.$or = buildSearchFilter(params.q);

  const [doctors, length] = await Promise.all([
    Doctor.find(query).sort(params.sort).skip(params.offset).limit(params.limit).lean(),
    Doctor.countDocuments(query),
  ]);

  const counts = await countPatientsByDoctor(doctors.map((doctor) => doctor._id));
  const data = doctors.map((doctor) => ({
    ...doctor,
    patientCount: counts.get(doctor._id.toString()) ?? 0,
  }));
  return { data, length };
};

export const getDoctorById = async (req: Request) => {
  const doctorId = req.query.id;
  db.assertObjectId(doctorId, "doctorId");

  const [doctor, patientCount] = await Promise.all([
    Doctor.findOne({ _id: doctorId }).lean(),
    Patient.countDocuments({ doctorId }),
  ]);
  if (!doctor) {
    throw new Error("Doctor not found");
  }
  return { ...doctor, patientCount };
};

export const createDoctor = async (req: Request) => {
  if (!req.isAdmin) {
    throw new Error("Only an admin can create doctors");
  }
  const payload = parseInput(doctorFieldsSchema, req.body);

  const doctor = {
    name: payload.name,
    nameLower: payload.name.toLowerCase(),
    specialization: payload.specialization,
    hospital: payload.hospital,
    phone: payload.phone,
    email: payload.email,
  };

  let created;
  try {
    created = await Doctor.create(doctor);
  } catch (error) {
    throw toReadableError(error);
  }
  const { nameLower: _nameLower, ...saved } = created.toObject();
  return { ...saved, patientCount: 0 };
};

export const updateDoctor = async (req: Request) => {
  if (!req.isAdmin) {
    throw new Error("Only an admin can update doctors");
  }
  const doctorId = req.params.id;
  db.assertObjectId(doctorId, "doctorId");
  const payload = parseInput(doctorFieldsSchema.partial(), req.body);
  assertHasFields(payload);

  // Only the fields that were sent are changed.
  const changes: Record<string, unknown> = {};
  if (payload.name !== undefined) {
    changes.name = payload.name;
    changes.nameLower = payload.name.toLowerCase();
  }
  if (payload.specialization !== undefined) changes.specialization = payload.specialization;
  if (payload.hospital !== undefined) changes.hospital = payload.hospital;
  if (payload.phone !== undefined) changes.phone = payload.phone;
  if (payload.email !== undefined) changes.email = payload.email;

  let doctor;
  try {
    doctor = await Doctor.findOneAndUpdate(
      { _id: doctorId },
      { $set: changes },
      { returnDocument: "after", runValidators: true },
    ).lean();
  } catch (error) {
    throw toReadableError(error);
  }
  if (!doctor) {
    throw new Error("Doctor not found");
  }
  const patientCount = await Patient.countDocuments({ doctorId });
  return { ...doctor, patientCount };
};

/** Lightweight _id/name list for pickers, sorted via the { nameLower, _id } index. */
export const listDoctorOptions = async (_req: Request) => {
  return Doctor.find()
    .select("name")
    .sort({ nameLower: 1, _id: 1 })
    .limit(MAX_DOCTOR_OPTIONS)
    .lean();
};

/** Distinct hospital names for the filter dropdown (served by the hospital index). */
export const listHospitals = async (_req: Request) => {
  const hospitals = await Doctor.distinct("hospital");
  return hospitals.sort((a, b) => a.localeCompare(b));
};
