import { Router } from 'express';
import { isDatabaseConnected } from './config/db.js';
import { authenticate } from './middlewares/authenticate.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { doctorRoutes } from './modules/doctors/doctor.routes.js';
import { patientRoutes } from './modules/patients/patient.routes.js';
import { statsRoutes } from './modules/stats/stats.routes.js';

export const routes = Router();

routes.get('/health', (_req, res) => {
  const database = isDatabaseConnected() ? 'up' : 'down';
  res.status(database === 'up' ? 200 : 503).json({
    status: database === 'up' ? 'ok' : 'degraded',
    database,
    uptime: Math.round(process.uptime()),
  });
});

const v1 = Router();

v1.use('/auth', authRoutes);
v1.use('/doctors', authenticate, doctorRoutes);
v1.use('/patients', authenticate, patientRoutes);
v1.use('/stats', authenticate, statsRoutes);

routes.use('/api/v1', v1);
