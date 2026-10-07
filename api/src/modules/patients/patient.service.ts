import { Types } from 'mongoose';
import { ApiError } from '../../utils/api-error.js';
import { buildMeta, type Paginated, toSkip } from '../../utils/pagination.js';
import { prefixRegex, toDateRangeFilter } from '../../utils/query.js';
import { Doctor } from '../doctors/doctor.model.js';
import { Patient } from './patient.model.js';
import type {
  ListPatientsQuery,
  PatientFieldsInput,
  UpdatePatientInput,
} from './patient.schema.js';

const PATIENT_FIELDS =
  'name age gender phone email condition status admissionDate doctor createdAt updatedAt';
const DOCTOR_SUMMARY_FIELDS = 'name specialization';

export interface DoctorSummary {
  id: string;
  name: string;
  specialization: string;
}

export interface PatientDto {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  condition: string;
  status: string;
  admissionDate: string;
  doctorId: string;
  doctor?: DoctorSummary;
  createdAt: string;
  updatedAt: string;
}

interface PatientRecord {
  _id: Types.ObjectId;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email?: string | null;
  condition: string;
  status: string;
  admissionDate: Date;
  doctor: Types.ObjectId | { _id: Types.ObjectId; name: string; specialization: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

function toPatientDto(patient: PatientRecord): PatientDto {
  const doctor = patient.doctor;
  const populated = doctor && !(doctor instanceof Types.ObjectId) ? doctor : undefined;

  return {
    id: patient._id.toString(),
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    ...(patient.email && { email: patient.email }),
    condition: patient.condition,
    status: patient.status,
    admissionDate: patient.admissionDate.toISOString(),
    doctorId: (populated?._id ?? (doctor as Types.ObjectId | null))?.toString() ?? '',
    ...(populated && {
      doctor: {
        id: populated._id.toString(),
        name: populated.name,
        specialization: populated.specialization,
      },
    }),
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}

function buildPatientFilter(query: Omit<ListPatientsQuery, 'page' | 'limit' | 'sort'>) {
  const filter: Record<string, unknown> = {};

  if (query.doctorId) filter.doctor = new Types.ObjectId(query.doctorId);
  if (query.condition) filter.condition = query.condition;
  if (query.status) filter.status = query.status;
  if (query.gender) filter.gender = query.gender;

  const admissionDate = toDateRangeFilter(query);
  if (admissionDate) filter.admissionDate = admissionDate;

  if (query.q) {
    const startsLikePhone = /^[+\d(]/.test(query.q);
    filter.$or = startsLikePhone
      ? [{ phone: prefixRegex(query.q) }]
      : [
          { nameLower: prefixRegex(query.q.toLowerCase()) },
          { email: prefixRegex(query.q.toLowerCase()) },
        ];
  }

  return filter;
}

export async function listPatients(
  query: ListPatientsQuery,
  { includeDoctor = true } = {},
): Promise<Paginated<PatientDto>> {
  const filter = buildPatientFilter(query);

  const findQuery = Patient.find(filter)
    .select(PATIENT_FIELDS)
    .sort(query.sort)
    .skip(toSkip(query))
    .limit(query.limit);
  if (includeDoctor) findQuery.populate('doctor', DOCTOR_SUMMARY_FIELDS);

  const [patients, total] = await Promise.all([
    findQuery.lean<PatientRecord[]>(),
    Patient.countDocuments(filter),
  ]);

  return { data: patients.map(toPatientDto), meta: buildMeta(query.page, query.limit, total) };
}

async function assertDoctorExists(doctorId: string, { asField = false } = {}) {
  const exists = await Doctor.exists({ _id: doctorId });
  if (exists) return;
  if (asField) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'doctorId', message: 'Doctor does not exist' },
    ]);
  }
  throw ApiError.notFound('Doctor not found');
}

export async function createPatient(
  doctorId: string,
  input: PatientFieldsInput,
  { doctorFromBody = false } = {},
): Promise<PatientDto> {
  await assertDoctorExists(doctorId, { asField: doctorFromBody });
  const patient = await Patient.create({ ...input, doctor: doctorId });
  return getPatient(patient._id.toString());
}

export async function getPatient(id: string): Promise<PatientDto> {
  const patient = await Patient.findById(id)
    .select(PATIENT_FIELDS)
    .populate('doctor', DOCTOR_SUMMARY_FIELDS)
    .lean<PatientRecord>();
  if (!patient) throw ApiError.notFound('Patient not found');
  return toPatientDto(patient);
}

export async function updatePatient(id: string, input: UpdatePatientInput): Promise<PatientDto> {
  const patient = await Patient.findById(id);
  if (!patient) throw ApiError.notFound('Patient not found');

  const { doctorId, ...fields } = input;
  if (doctorId) {
    await assertDoctorExists(doctorId, { asField: true });
    patient.set('doctor', doctorId);
  }
  patient.set(fields);
  await patient.save();

  return getPatient(id);
}

export async function deletePatient(id: string): Promise<void> {
  const deleted = await Patient.findByIdAndDelete(id).select('_id').lean();
  if (!deleted) throw ApiError.notFound('Patient not found');
}

/** Patient counts for a page of doctors, served by the { doctor, admissionDate } index. */
export async function countPatientsByDoctor(doctorIds: Types.ObjectId[]) {
  if (doctorIds.length === 0) return new Map<string, number>();
  const rows = await Patient.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { doctor: { $in: doctorIds } } },
    { $group: { _id: '$doctor', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}
