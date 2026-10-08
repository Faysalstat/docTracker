import dotenv from "dotenv";

// Imported first by app.ts, scripts and tests so every later module sees the variables.
// Hosted environments inject them directly; a missing .env file is not an error.
dotenv.config({ quiet: true });
