import type { Request, Response } from 'express';
import { idParamsSchema } from '../../utils/query.js';
import {
  createPatientSchema,
  listPatientsQuerySchema,
  updatePatientSchema,
} from './patient.schema.js';
import * as patientService from './patient.service.js';

export async function list(req: Request, res: Response) {
  const query = listPatientsQuerySchema.parse(req.query);
  res.json(await patientService.listPatients(query));
}

export async function create(req: Request, res: Response) {
  const { doctorId, ...fields } = createPatientSchema.parse(req.body);
  const patient = await patientService.createPatient(doctorId, fields, { doctorFromBody: true });
  res.status(201).location(`${req.baseUrl}/${patient.id}`).json(patient);
}

export async function getById(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  res.json(await patientService.getPatient(id));
}

export async function update(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  const input = updatePatientSchema.parse(req.body);
  res.json(await patientService.updatePatient(id, input));
}

export async function remove(req: Request, res: Response) {
  const { id } = idParamsSchema.parse(req.params);
  await patientService.deletePatient(id);
  res.status(204).end();
}
