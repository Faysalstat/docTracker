import "../src/config/load-env";
import * as connector from "../src/connector/db-connector";
import Doctor from "../src/model/doctor";
import Patient from "../src/model/patient";
import User from "../src/model/user";

/**
 * Builds the schema indexes and drops ones no longer declared. autoIndex is off in
 * production, so run this after deploying a schema change:
 *   npm run sync-indexes
 */
async function main() {
  await connector.connect();
  for (const model of [User, Doctor, Patient]) {
    const dropped = await model.syncIndexes();
    console.log(
      `${model.collection.name}: indexes synced${dropped.length ? `, dropped ${dropped.join(", ")}` : ""}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => connector.close());
