import type { ConnectOptions } from "mongoose";

export const URI = process.env.MONGO_URI;

export const options: ConnectOptions = {
  maxPoolSize: 15,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 30000,
  // Indexes are built automatically in development; production runs `npm run sync-indexes`.
  autoIndex: process.env.NODE_ENV !== "production",
};
