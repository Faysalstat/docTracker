import { Router } from 'express';
import * as statsController from './stats.controller.js';

export const statsRoutes = Router();

statsRoutes.get('/summary', statsController.summary);
statsRoutes.get('/patients-per-doctor', statsController.patientsPerDoctor);
statsRoutes.get('/admissions', statsController.admissions);
statsRoutes.get('/conditions', statsController.conditions);
