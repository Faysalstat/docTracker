import type { Request, Response } from 'express';
import {
  admissionsQuerySchema,
  patientsPerDoctorQuerySchema,
  statsRangeSchema,
} from './stats.schema.js';
import * as statsService from './stats.service.js';

export async function summary(req: Request, res: Response) {
  res.json(await statsService.getSummary(statsRangeSchema.parse(req.query)));
}

export async function patientsPerDoctor(req: Request, res: Response) {
  const query = patientsPerDoctorQuerySchema.parse(req.query);
  const rows = await statsService.getPatientsPerDoctor(query);
  res.json({ data: rows.map((row) => ({ ...row, doctorId: row.doctorId.toString() })) });
}

export async function admissions(req: Request, res: Response) {
  res.json(await statsService.getAdmissions(admissionsQuerySchema.parse(req.query)));
}

export async function conditions(req: Request, res: Response) {
  res.json({ data: await statsService.getConditions(statsRangeSchema.parse(req.query)) });
}
