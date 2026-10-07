import bcrypt from 'bcrypt';
import { z } from 'zod';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { isProduction } from '../src/config/env.js';
import { logger } from '../src/config/logger.js';
import { PASSWORD_SALT_ROUNDS } from '../src/modules/auth/auth.service.js';
import { Doctor } from '../src/modules/doctors/doctor.model.js';
import { Patient } from '../src/modules/patients/patient.model.js';
import { User } from '../src/modules/users/user.model.js';
import { buildDemoData } from './demo-data.js';

/**
 * Usage:
 *   npm run seed                              admin user only (idempotent, safe to re-run)
 *   npm run seed -- --reset-demo-data         admin + REPLACES all doctors and patients
 *     [--doctors=50] [--patients=2000] [--months=12]
 */
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'] as const;
  }),
);

const seedEnv = z
  .object({
    SEED_ADMIN_NAME: z.string().min(1).default('Admin'),
    SEED_ADMIN_EMAIL: z.email().toLowerCase(),
    SEED_ADMIN_PASSWORD: z.string().min(8, 'SEED_ADMIN_PASSWORD must be at least 8 characters'),
  })
  .parse(process.env);

const demoOptions = z
  .object({
    doctors: z.coerce.number().int().min(1).max(5_000).default(50),
    patients: z.coerce.number().int().min(0).max(500_000).default(2_000),
    months: z.coerce.number().int().min(1).max(60).default(12),
  })
  .parse({
    doctors: args.get('doctors'),
    patients: args.get('patients'),
    months: args.get('months'),
  });

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(seedEnv.SEED_ADMIN_PASSWORD, PASSWORD_SALT_ROUNDS);

  // Idempotent: creates the admin, or resets its name and password on re-run.
  await User.updateOne(
    { email: seedEnv.SEED_ADMIN_EMAIL },
    { $set: { name: seedEnv.SEED_ADMIN_NAME, passwordHash, role: 'admin' } },
    { upsert: true },
  );
  logger.info({ email: seedEnv.SEED_ADMIN_EMAIL }, 'Admin user ready');
}

async function seedDemoData() {
  if (isProduction) throw new Error('Refusing to reset demo data in production');

  const { doctors, patients } = buildDemoData(demoOptions);

  await Promise.all([Doctor.deleteMany({}), Patient.deleteMany({})]);
  // Raw driver inserts in batches: the generator produces valid documents (including
  // explicit timestamps), and this is much faster than per-document validation.
  await Doctor.collection.insertMany(doctors);
  for (let index = 0; index < patients.length; index += 5_000) {
    await Patient.collection.insertMany(patients.slice(index, index + 5_000));
  }
  logger.info({ doctors: doctors.length, patients: patients.length }, 'Demo data ready');
}

async function main() {
  await connectDatabase();
  // Explicit index builds (autoIndex is off in production).
  await Promise.all([User.syncIndexes(), Doctor.syncIndexes(), Patient.syncIndexes()]);
  await seedAdmin();
  if (args.has('reset-demo-data')) await seedDemoData();
}

try {
  await main();
} catch (err) {
  logger.error({ err }, 'Seed failed');
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
