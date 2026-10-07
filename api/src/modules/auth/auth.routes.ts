import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import * as authController from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/login', authController.login);
authRoutes.get('/me', authenticate, authController.me);
