import type { Types } from 'mongoose';
import { ApiError } from '../../utils/api-error.js';
import { buildMeta, type Paginated, toSkip } from '../../utils/pagination.js';
import { prefixRegex, toDateRangeFilter } from '../../utils/query.js';
import { countPatientsByDoctor } from '../patients/patient.service.js';
import { Patient } from '../patients/patient.model.js';
import { Doctor } from './doctor.model.js';
import type { CreateDoctorInput, ListDoctorsQuery, UpdateDoctorInput } from './doctor.schema.js';

// Upper bound for picker lists; beyond this a searchable (server-side) combobox is needed.
const MAX_DOCTOR_OPTIONS = 1000;

const DOCTOR_FIELDS = 'name specialization hospital phone email createdAt updatedAt';

export interface DoctorDto {
  id: string;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  patientCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DoctorRecord {
  _id: Types.ObjectId;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

function toDoctorDto(doctor: DoctorRecord, patientCount: number): DoctorDto {
  return {
    id: doctor._id.toString(),
    name: doctor.name,
    specialization: doctor.specialization,
    hospital: doctor.hospital,
    phone: doctor.phone,
    email: doctor.email,
    patientCount,
    createdAt: doctor.createdAt.toISOString(),
    updatedAt: doctor.updatedAt.toISOString(),
  };
}

function buildDoctorFilter(query: ListDoctorsQuery) {
  const filter: Record<string, unknown> = {};

  if (query.specialization) filter.specialization = query.specialization;
  if (query.hospital) filter.hospital = query.hospital;

  const createdAt = toDateRangeFilter(query);
  if (createdAt) filter.createdAt = createdAt;

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

export async function listDoctors(query: ListDoctorsQuery): Promise<Paginated<DoctorDto>> {
  const filter = buildDoctorFilter(query);

  const [doctors, total] = await Promise.all([
    Doctor.find(filter)
      .select(DOCTOR_FIELDS)
      .sort(query.sort)
      .skip(toSkip(query))
      .limit(query.limit)
      .lean<DoctorRecord[]>(),
    Doctor.countDocuments(filter),
  ]);

  const counts = await countPatientsByDoctor(doctors.map((doctor) => doctor._id));

  return {
    data: doctors.map((doctor) => toDoctorDto(doctor, counts.get(doctor._id.toString()) ?? 0)),
    meta: buildMeta(query.page, query.limit, total),
  };
}

export async function getDoctor(id: string): Promise<DoctorDto> {
  const [doctor, patientCount] = await Promise.all([
    Doctor.findById(id).select(DOCTOR_FIELDS).lean<DoctorRecord>(),
    Patient.countDocuments({ doctor: id }),
  ]);
  if (!doctor) throw ApiError.notFound('Doctor not found');
  return toDoctorDto(doctor, patientCount);
}

export async function createDoctor(input: CreateDoctorInput): Promise<DoctorDto> {
  const doctor = await Doctor.create(input);
  return toDoctorDto(doctor.toObject<DoctorRecord>(), 0);
}

export async function updateDoctor(id: string, input: UpdateDoctorInput): Promise<DoctorDto> {
  const doctor = await Doctor.findById(id);
  if (!doctor) throw ApiError.notFound('Doctor not found');

  doctor.set(input);
  await doctor.save();

  return getDoctor(id);
}

export interface DoctorOption {
  id: string;
  name: string;
}

/** Lightweight id/name list for pickers, sorted via the { nameLower, _id } index. */
export async function listDoctorOptions(): Promise<DoctorOption[]> {
  const doctors = await Doctor.find()
    .select('name')
    .sort({ nameLower: 1, _id: 1 })
    .limit(MAX_DOCTOR_OPTIONS)
    .lean<{ _id: Types.ObjectId; name: string }[]>();
  return doctors.map((doctor) => ({ id: doctor._id.toString(), name: doctor.name }));
}

/** Distinct hospital names for the filter dropdown (served by the hospital index). */
export async function listHospitals(): Promise<string[]> {
  const hospitals = await Doctor.distinct('hospital');
  return hospitals.sort((a, b) => a.localeCompare(b));
}
