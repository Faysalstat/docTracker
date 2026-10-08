import "../src/config/load-env";
import * as connector from "../src/connector/db-connector";
import Doctor from "../src/model/doctor";
import Patient from "../src/model/patient";
import User from "../src/model/user";

/**
 * One-off migration to the backend-rules data layout. Idempotent: safe to re-run.
 *   - collections users/doctors/patients → user/doctor/patient
 *   - patient.doctor → patient.doctorId, user.passwordHash → user.password
 *   - drops the unused __v field
 *   - syncs indexes (drops the old { doctor, admissionDate } index)
 *
 * Take a backup into backups/ first (see README "Database backups").
 *   npm run migrate:rules-alignment
 */

const COLLECTION_RENAMES = [
  ["users", "user"],
  ["doctors", "doctor"],
  ["patients", "patient"],
] as const;

async function renameCollections() {
  const db = connector.mongoose.connection.db;
  if (!db) throw new Error("Database is not connected");

  const existing = new Set(
    (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name),
  );
  for (const [from, to] of COLLECTION_RENAMES) {
    if (!existing.has(from)) continue;
    if (existing.has(to)) {
      // An empty target can exist if the new server already started and built its indexes.
      const count = await db.collection(to).estimatedDocumentCount();
      if (count > 0) {
        throw new Error(`Both "${from}" and "${to}" contain data; merge them manually`);
      }
      await db.dropCollection(to);
    }
    await db.renameCollection(from, to);
    console.log(`Renamed collection ${from} → ${to}`);
  }
}

async function renameFields() {
  const db = connector.mongoose.connection.db;
  if (!db) throw new Error("Database is not connected");

  const patients = await db
    .collection("patient")
    .updateMany({ doctor: { $exists: true } }, { $rename: { doctor: "doctorId" } });
  console.log(`patient.doctor → doctorId: ${patients.modifiedCount} documents`);

  const users = await db
    .collection("user")
    .updateMany({ passwordHash: { $exists: true } }, { $rename: { passwordHash: "password" } });
  console.log(`user.passwordHash → password: ${users.modifiedCount} documents`);

  for (const [, name] of COLLECTION_RENAMES) {
    const result = await db
      .collection(name)
      .updateMany({ __v: { $exists: true } }, { $unset: { __v: "" } });
    console.log(`${name}.__v removed: ${result.modifiedCount} documents`);
  }
}

async function main() {
  // No automatic index builds or collection creation: either would create the new
  // (empty) collections before the renames below.
  await connector.connect({ autoIndex: false, autoCreate: false });
  await renameCollections();
  await renameFields();

  for (const model of [User, Doctor, Patient]) {
    const dropped = await model.syncIndexes();
    console.log(
      `${model.collection.name}: indexes synced${dropped.length ? `, dropped ${dropped.join(", ")}` : ""}`,
    );
  }
  console.log("Migration complete");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => connector.close());
