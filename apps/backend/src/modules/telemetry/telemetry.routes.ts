import { Router } from "express";
import { ZodError } from "zod";
import { env } from "../../env.js";
import { parseGenericJsonPacket } from "./adapters/genericJsonAdapter.js";
import { ingestPing, VehicleNotFoundError } from "./telemetry.service.js";

export const telemetryRouter = Router();

// Real hardware trackers can't do JWT login, so ingestion is gated behind a
// static shared secret instead of the user-facing auth middleware — this is
// the "trusted device network" boundary, not a user permission boundary.
function requireIngestKey(req: import("express").Request, res: import("express").Response, next: () => void) {
  if (req.headers["x-ingest-key"] !== env.ingestApiKey) {
    return res.status(401).json({ error: "Invalid or missing ingest key" });
  }
  next();
}

telemetryRouter.post("/ingest", requireIngestKey, async (req, res) => {
  try {
    const ping = parseGenericJsonPacket(req.body);
    const result = await ingestPing(ping);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.flatten() });
    }
    if (err instanceof VehicleNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    throw err;
  }
});
