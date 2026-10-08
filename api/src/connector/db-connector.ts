import mongoose, { type ConnectOptions } from "mongoose";
import * as dbConfig from "../config/db.config";

if (!dbConfig.URI) {
  throw new Error("Database configuration missing. Set MONGO_URI (see .env.example).");
}

const URI = dbConfig.URI;

// Queries with fields not in the schema are rejected instead of silently dropped.
mongoose.set("strictQuery", true);

export { mongoose };

// `overrides` is for scripts that must control index/collection creation (see migrations).
export const connect = async (overrides: ConnectOptions = {}) => {
  await mongoose.connect(URI, { ...dbConfig.options, ...overrides });
};

export const close = async () => {
  await mongoose.connection.close();
};

/**
 * Throws "<name> is invalid" unless `id` is a 24-char hex string. Stricter than
 * ObjectId.isValid, which also accepts any 12-character string, and rejects the
 * objects qs builds from `?id[$gt]=` so they never reach a query.
 */
export function assertObjectId(id: unknown, name = "id"): asserts id is string {
  if (typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) {
    throw new Error(`${name} is invalid`);
  }
}
