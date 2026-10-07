import { Router } from 'express';
import { isDatabaseConnected } from './config/db.js';
import { authRoutes } from './modules/auth/auth.routes.js';

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
// Protected feature routers are mounted with `authenticate`, e.g.
// v1.use('/doctors', authenticate, doctorRoutes).

routes.use('/api/v1', v1);
