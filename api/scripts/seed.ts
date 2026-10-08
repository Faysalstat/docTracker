import "../src/config/load-env";
import bcrypt from "bcrypt";
import { z } from "zod";
import * as connector from "../src/connector/db-connector";
import Doctor from "../src/model/doctor";
import { USER_ROLES } from "../src/model/enums";
import Patient from "../src/model/patient";
import User from "../src/model/user";
import { PASSWORD_SALT_ROUNDS } from "../src/service/auth-service";
import { buildDemoData } from "./demo-data";

/**
 * Usage:
 *   npm run seed                              admin user only (idempotent, safe to re-run)
 *   npm run seed -- --reset-demo-data         admin + REPLACES all doctors and patients
 *     [--doctors=50] [--patients=2000] [--months=12]
 */
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"] as const;
  }),
);

const seedEnv = z
  .object({
    SEED_ADMIN_NAME: z.string().min(1).default("Admin"),
    SEED_ADMIN_EMAIL: z.email().toLowerCase(),
    SEED_ADMIN_PASSWORD: z.string().min(8, "SEED_ADMIN_PASSWORD must be at least 8 characters"),
  })
  .parse(process.env);

const demoOptions = z
  .object({
    doctors: z.coerce.number().int().min(1).max(5_000).default(50),
    patients: z.coerce.number().int().min(0).max(500_000).default(2_000),
    months: z.coerce.number().int().min(1).max(60).default(12),
  })
  .parse({
    doctors: args.get("doctors"),
    patients: args.get("patients"),
    months: args.get("months"),
  });

async function seedAdmin() {
  const password = await bcrypt.hash(seedEnv.SEED_ADMIN_PASSWORD, PASSWORD_SALT_ROUNDS);

  // Idempotent: creates the admin, or resets its name and password on re-run.
  await User.updateOne(
    { email: seedEnv.SEED_ADMIN_EMAIL },
    { $set: { name: seedEnv.SEED_ADMIN_NAME, password, role: USER_ROLES.ADMIN } },
    { upsert: true },
  );
  console.log(`Admin user ready: ${seedEnv.SEED_ADMIN_EMAIL}`);
}

async function seedDemoData() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to reset demo data in production");
  }

  const { doctors, patients } = buildDemoData(demoOptions);

  await Promise.all([Doctor.deleteMany({}), Patient.deleteMany({})]);
  // Raw driver inserts in batches: the generator produces valid documents (including
  // explicit timestamps), and this is much faster than per-document validation.
  await Doctor.collection.insertMany(doctors);
  for (let index = 0; index < patients.length; index += 5_000) {
    await Patient.collection.insertMany(patients.slice(index, index + 5_000));
  }
  console.log(`Demo data ready: ${doctors.length} doctors, ${patients.length} patients`);
}

async function main() {
  await connector.connect();
  // Explicit index builds (autoIndex is off in production).
  await Promise.all([User.syncIndexes(), Doctor.syncIndexes(), Patient.syncIndexes()]);
  await seedAdmin();
  if (args.has("reset-demo-data")) await seedDemoData();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => connector.close());
