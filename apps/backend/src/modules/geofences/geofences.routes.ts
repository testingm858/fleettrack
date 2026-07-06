import { Router } from "express";
import type { Geofence as SharedGeofence } from "@fleettrack/shared-types";
import { prisma } from "../../db/prisma.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { createGeofenceSchema, updateGeofenceSchema } from "./geofences.schema.js";

export const geofencesRouter = Router();

geofencesRouter.use(requireAuth);

type GeofenceRow = Awaited<ReturnType<typeof prisma.geofence.findFirstOrThrow>>;

function toSharedGeofence(row: GeofenceRow): SharedGeofence {
  return {
    id: row.id,
    name: row.name,
    shape: row.shape as SharedGeofence["shape"],
    coordinates: JSON.parse(row.coordinatesJson),
    radiusMeters: row.radiusMeters,
    alertOnEntry: row.alertOnEntry,
    alertOnExit: row.alertOnExit,
    assignedVehicleIds: JSON.parse(row.assignedVehicleIdsJson),
  };
}

geofencesRouter.get("/", async (_req, res) => {
  const geofences = await prisma.geofence.findMany({ orderBy: { name: "asc" } });
  res.json(geofences.map(toSharedGeofence));
});

geofencesRouter.get("/:id", async (req, res) => {
  const geofence = await prisma.geofence.findUnique({ where: { id: req.params.id } });
  if (!geofence) return res.status(404).json({ error: "Geofence not found" });
  res.json(toSharedGeofence(geofence));
});

geofencesRouter.post("/", requireRole("admin", "fleet_manager"), async (req, res) => {
  const parsed = createGeofenceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { coordinates, assignedVehicleIds, ...data } = parsed.data;
  const geofence = await prisma.geofence.create({
    data: {
      ...data,
      radiusMeters: data.radiusMeters ?? null,
      alertOnEntry: data.alertOnEntry ?? true,
      alertOnExit: data.alertOnExit ?? true,
      coordinatesJson: JSON.stringify(coordinates),
      assignedVehicleIdsJson: JSON.stringify(assignedVehicleIds ?? []),
    },
  });
  res.status(201).json(toSharedGeofence(geofence));
});

geofencesRouter.patch("/:id", requireRole("admin", "fleet_manager"), async (req, res) => {
  const parsed = updateGeofenceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.geofence.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Geofence not found" });

  const { coordinates, assignedVehicleIds, ...data } = parsed.data;
  const geofence = await prisma.geofence.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(coordinates ? { coordinatesJson: JSON.stringify(coordinates) } : {}),
      ...(assignedVehicleIds ? { assignedVehicleIdsJson: JSON.stringify(assignedVehicleIds) } : {}),
    },
  });
  res.json(toSharedGeofence(geofence));
});

geofencesRouter.delete("/:id", requireRole("admin", "fleet_manager"), async (req, res) => {
  const existing = await prisma.geofence.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Geofence not found" });

  await prisma.geofence.delete({ where: { id: existing.id } });
  res.status(204).send();
});
