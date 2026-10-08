import "./src/config/load-env"; // first: every module below reads process.env at import time
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import * as connector from "./src/connector/db-connector";
import "./src/model/init-model";
import authMiddleware from "./src/middleware/auth-middleware";
import { errorMiddleware, notFoundMiddleware } from "./src/middleware/fallback-middleware";
import authRoute from "./src/router/auth-route";
import doctorRoute from "./src/router/doctor-route";
import patientRoute from "./src/router/patient-route";
import statsRoute from "./src/router/stats-route";

const port = Number(process.env.SERVER_PORT) || 3000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

export const app = express();

// Security headers; also removes X-Powered-By.
app.use(helmet());
app.use(bodyParser.json({ limit: "100kb" }));
// The web app calls the API server-to-server, so browsers get no CORS access unless
// CORS_ORIGIN lists an origin on purpose.
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : false }));
app.set("etag", false);
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/api", (req, res) => {
  res.json({ message: "API is alive" });
});

app.use(authMiddleware);

app.use("/api/auth", authRoute);
app.use("/api/doctor", doctorRoute);
app.use("/api/patient", patientRoute);
app.use("/api/stats", statsRoute);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

function start() {
  connector
    .connect()
    .then(() => {
      console.log("database connected!");
      const server = app.listen(port, () => console.log(`server is running on ${port}`));
      server.on("error", (err) => {
        console.error(`Server failed to listen on ${port}`, err.message);
        process.exit(1);
      });
      handleShutdown(server);
    })
    .catch((err) => {
      console.error("Error creating database connection", err);
      process.exit(1);
    });
}

function handleShutdown(server: ReturnType<typeof app.listen>) {
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down`);
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
    server.close(() => {
      connector
        .close()
        .catch((err) => console.error("Error closing database connection", err))
        .finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Tests import `app` and listen themselves; only a direct run starts the server.
if (require.main === module) {
  start();
}
