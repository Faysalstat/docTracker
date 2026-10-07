import { Router } from 'express';
import { isDatabaseConnected } from './config/db.js';

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
// Feature routers are mounted here as modules are added, e.g. v1.use('/doctors', doctorRoutes).
routes.use('/api/v1', v1);
