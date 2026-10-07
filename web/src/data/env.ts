import 'server-only';
import { z } from 'zod';

// The only place that reads server secrets. Fails fast on misconfiguration.
const serverEnv = z
  .object({
    API_URL: z.url(),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  })
  .parse(process.env);

export const env = {
  apiUrl: serverEnv.API_URL.replace(/\/$/, ''),
  jwtSecret: new TextEncoder().encode(serverEnv.JWT_SECRET),
  isProduction: process.env.NODE_ENV === 'production',
};
