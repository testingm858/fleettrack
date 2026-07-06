import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { env } from "./env.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { vehiclesRouter } from "./modules/vehicles/vehicles.routes.js";
import { driversRouter } from "./modules/drivers/drivers.routes.js";
import { geofencesRouter } from "./modules/geofences/geofences.routes.js";
import { telemetryRouter } from "./modules/telemetry/telemetry.routes.js";
import { vehicleStatusRouter } from "./modules/vehicleStatus/vehicleStatus.routes.js";
import { alertsRouter } from "./modules/alerts/alerts.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/vehicles", vehiclesRouter);
  app.use("/api/drivers", driversRouter);
  app.use("/api/geofences", geofencesRouter);
  app.use("/api/telemetry", telemetryRouter);
  app.use("/api/vehicle-status", vehicleStatusRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api/users", usersRouter);

  app.use(errorHandler);

  return app;
}
