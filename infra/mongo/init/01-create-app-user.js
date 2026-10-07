// Runs once, on first start with an empty data volume.
// Creates a least-privilege user for the API (readWrite on the app database only).
const dbName = process.env.MONGO_APP_DATABASE;

db.getSiblingDB(dbName).createUser({
  user: process.env.MONGO_APP_USERNAME,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: dbName }],
});
