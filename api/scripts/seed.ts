import bcrypt from 'bcrypt';
import { z } from 'zod';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { logger } from '../src/config/logger.js';
import { PASSWORD_SALT_ROUNDS } from '../src/modules/auth/auth.service.js';
import { User } from '../src/modules/users/user.model.js';

const seedEnv = z
  .object({
    SEED_ADMIN_NAME: z.string().min(1).default('Admin'),
    SEED_ADMIN_EMAIL: z.email().toLowerCase(),
    SEED_ADMIN_PASSWORD: z.string().min(8, 'SEED_ADMIN_PASSWORD must be at least 8 characters'),
  })
  .parse(process.env);

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

async function main() {
  await connectDatabase();
  await User.syncIndexes();
  await seedAdmin();
}

try {
  await main();
} catch (err) {
  logger.error({ err }, 'Seed failed');
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
