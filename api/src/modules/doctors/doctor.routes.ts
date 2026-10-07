import { Router } from 'express';
import * as doctorController from './doctor.controller.js';

export const doctorRoutes = Router();

doctorRoutes.get('/', doctorController.list);
doctorRoutes.post('/', doctorController.create);
doctorRoutes.get('/options', doctorController.options);
doctorRoutes.get('/hospitals', doctorController.hospitals);
doctorRoutes.get('/:id', doctorController.getById);
doctorRoutes.patch('/:id', doctorController.update);
doctorRoutes.get('/:id/patients', doctorController.listPatients);
doctorRoutes.post('/:id/patients', doctorController.addPatient);
