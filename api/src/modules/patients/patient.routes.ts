import { Router } from 'express';
import * as patientController from './patient.controller.js';

export const patientRoutes = Router();

patientRoutes.get('/', patientController.list);
patientRoutes.post('/', patientController.create);
patientRoutes.get('/:id', patientController.getById);
patientRoutes.patch('/:id', patientController.update);
patientRoutes.delete('/:id', patientController.remove);
