import type { Request, Response } from 'express';
import { idParamsSchema } from '../../utils/query.js';
import { listDoctorPatientsQuerySchema, patientFieldsSchema } from '../patients/patient.schema.js';
import * as patientService from '../patients/patient.service.js';
import { createDoctorSchema, listDoctorsQuerySchema, updateDoctorSchema } from './doctor.schema.js';
import * as doctorService from './doctor.service.js';

export async function list(req: Request, res: Response) {
  const query = listDoctorsQuerySchema.parse(req.query);
  res.json(await doctorService.listDoctors(query));
}

export async function hospitals(_req: Request, res: Response) {
  res.json({ data: await doctorService.listHospitals() });
}

export async function create(req: Request, res: Response) {
  const input = createDoctorSchema.parse(req.body);
  const doctor = await doctorService.createDoctor(input);
  res.status(201).location(`${req.baseUrl}/${doctor.id}`).json(doctor);
}

export async function getById(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await doctorService.getDoctor(id));
}

export async function update(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const input = updateDoctorSchema.parse(req.body);
  res.json(await doctorService.updateDoctor(id, input));
}

export async function listPatients(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const query = listDoctorPatientsQuerySchema.parse(req.query);
  await doctorService.getDoctor(id); // 404 for unknown doctors instead of an empty list
  res.json(await patientService.listPatients({ ...query, doctorId: id }, { includeDoctor: false }));
}

export async function addPatient(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const input = patientFieldsSchema.parse(req.body);
  const patient = await patientService.createPatient(id, input);
  res.status(201).location(`/api/v1/patients/${patient.id}`).json(patient);
}
