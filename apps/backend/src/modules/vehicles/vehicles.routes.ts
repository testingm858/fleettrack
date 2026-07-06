import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type {
  AlertThresholds,
  DriverContact,
  TelemetryPing as SharedPing,
  Vehicle as SharedVehicle,
} from "@fleettrack/shared-types";
import { prisma } from "../../db/prisma.js";
import { requireAuth, requireRole, type AuthedRequest } from "../auth/auth.middleware.js";
import { CHANNELS, pubsub } from "../../realtime/pubsub.js";
import { toSharedVehicleStatus } from "../telemetry/telemetry.service.js";
import { createVehicleSchema, updateVehicleSchema } from "./vehicles.schema.js";

export const vehiclesRouter = Router();

vehiclesRouter.use(requireAuth);

type VehicleWithDriver = Prisma.VehicleGetPayload<{ include: { driver: true } }>;

function toSharedVehicle(vehicle: VehicleWithDriver): SharedVehicle {
  return {
    id: vehicle.id,
    name: vehicle.name,
    plateNumber: vehicle.plateNumber,
    type: vehicle.type as SharedVehicle["type"],
    imei: vehicle.imei,
    driverId: vehicle.driver?.id ?? null,
    groupId: vehicle.groupId,
    iconType: vehicle.iconType,
    createdAt: vehicle.createdAt.toISOString(),
  };
}

// A "driver" role account only ever sees the single vehicle assigned to
// their linked Driver record — never the fleet-wide list.
async function resolveOwnVehicleId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { driver: true },
  });
  return user?.driver?.assignedVehicleId ?? null;
}

async function assignDriverToVehicle(vehicleId: string, driverId: string | null | undefined) {
  if (driverId === undefined) return;

  // Clear whichever driver currently holds this vehicle before reassigning,
  // since assignedVehicleId is unique on Driver.
  await prisma.driver.updateMany({
    where: { assignedVehicleId: vehicleId },
    data: { assignedVehicleId: null },
  });

  if (driverId) {
    await prisma.driver.update({ where: { id: driverId }, data: { assignedVehicleId: vehicleId } });
  }
}

vehiclesRouter.get("/", async (req: AuthedRequest, res) => {
  if (req.user!.role === "driver") {
    const ownVehicleId = await resolveOwnVehicleId(req.user!.sub);
    if (!ownVehicleId) return res.json([]);
    const vehicle = await prisma.vehicle.findUnique({ where: { id: ownVehicleId }, include: { driver: true } });
    return res.json(vehicle ? [toSharedVehicle(vehicle)] : []);
  }

  const vehicles = await prisma.vehicle.findMany({ include: { driver: true }, orderBy: { createdAt: "asc" } });
  res.json(vehicles.map(toSharedVehicle));
});

vehiclesRouter.get("/:id", async (req: AuthedRequest, res) => {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id }, include: { driver: true } });
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

  if (req.user!.role === "driver") {
    const ownVehicleId = await resolveOwnVehicleId(req.user!.sub);
    if (vehicle.id !== ownVehicleId) return res.status(403).json({ error: "Insufficient permissions" });
  }

  res.json(toSharedVehicle(vehicle));
});

// Returns false (and writes the 403 response itself) when a "driver" role
// account tries to reach a vehicle other than their own assigned one.
async function checkVehicleScope(req: AuthedRequest, res: import("express").Response, vehicleId: string): Promise<boolean> {
  if (req.user!.role !== "driver") return true;
  const ownVehicleId = await resolveOwnVehicleId(req.user!.sub);
  if (vehicleId !== ownVehicleId) {
    res.status(403).json({ error: "Insufficient permissions" });
    return false;
  }
  return true;
}

vehiclesRouter.get("/:id/pings", async (req: AuthedRequest, res) => {
  if (!(await checkVehicleScope(req, res, req.params.id))) return;

  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const pings = await prisma.telemetryPing.findMany({
    where: { vehicleId: req.params.id },
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  const shared: SharedPing[] = pings.map((p) => ({
    id: p.id,
    vehicleId: p.vehicleId,
    timestamp: p.timestamp.toISOString(),
    lat: p.lat,
    lng: p.lng,
    speed: p.speed,
    heading: p.heading,
    ignition: p.ignition,
    immobilizer: p.immobilizer,
    charging: p.charging,
    batteryPct: p.batteryPct,
    satelliteCount: p.satelliteCount,
    rssiPct: p.rssiPct,
    odometerKm: p.odometerKm,
    address: p.address,
  }));
  res.json(shared);
});

vehiclesRouter.get("/:id/driver-contact", async (req: AuthedRequest, res) => {
  if (!(await checkVehicleScope(req, res, req.params.id))) return;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id }, include: { driver: true } });
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

  const contact: DriverContact | null = vehicle.driver
    ? { name: vehicle.driver.name, phone: vehicle.driver.phone }
    : null;
  res.json(contact);
});

vehiclesRouter.get("/:id/thresholds", async (req: AuthedRequest, res) => {
  if (!(await checkVehicleScope(req, res, req.params.id))) return;

  const thresholds = await prisma.alertThreshold.findUnique({ where: { vehicleId: req.params.id } });
  if (!thresholds) return res.status(404).json({ error: "No thresholds found for this vehicle" });
  res.json(thresholds satisfies AlertThresholds);
});

const updateThresholdsSchema = z.object({
  speedLimitKmh: z.number().positive().optional(),
  idleThresholdSeconds: z.number().int().positive().optional(),
  lowBatteryPct: z.number().min(0).max(100).optional(),
  offlineTimeoutSeconds: z.number().int().positive().optional(),
});

vehiclesRouter.patch("/:id/thresholds", requireRole("admin", "fleet_manager"), async (req, res) => {
  const parsed = updateThresholdsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.alertThreshold.findUnique({ where: { vehicleId: req.params.id } });
  if (!existing) return res.status(404).json({ error: "No thresholds found for this vehicle" });

  const updated = await prisma.alertThreshold.update({ where: { vehicleId: req.params.id }, data: parsed.data });
  res.json(updated satisfies AlertThresholds);
});

const setImmobilizerSchema = z.object({ enable: z.boolean() });

// Safety-critical remote command: the frontend must show its own explicit
// confirmation dialog before calling this (cutting a moving vehicle's engine
// is not something a stray tap should trigger) — this endpoint enforces the
// audit trail half of that requirement, not the confirmation UX.
vehiclesRouter.post("/:id/immobilizer", requireRole("admin", "fleet_manager"), async (req: AuthedRequest, res) => {
  const parsed = setImmobilizerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.vehicleStatus.findUnique({ where: { vehicleId: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Vehicle not found" });

  const updated = await prisma.vehicleStatus.update({
    where: { vehicleId: req.params.id },
    data: { immobilizer: parsed.data.enable },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.sub,
      vehicleId: req.params.id,
      action: parsed.data.enable ? "immobilizer_engaged" : "immobilizer_released",
    },
  });

  const sharedStatus = toSharedVehicleStatus(updated);
  pubsub.publish(CHANNELS.vehicleStatusUpdated, sharedStatus);
  res.json(sharedStatus);
});

vehiclesRouter.post("/", requireRole("admin", "fleet_manager"), async (req, res) => {
  const parsed = createVehicleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { driverId, ...data } = parsed.data;
  const vehicle = await prisma.vehicle.create({
    data: { ...data, groupId: data.groupId ?? null, iconType: data.iconType ?? "car" },
  });
  await assignDriverToVehicle(vehicle.id, driverId);

  await prisma.alertThreshold.create({ data: { vehicleId: vehicle.id } });
  await prisma.vehicleStatus.create({ data: { vehicleId: vehicle.id, currentStatus: "offline" } });

  const withDriver = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicle.id }, include: { driver: true } });
  res.status(201).json(toSharedVehicle(withDriver));
});

vehiclesRouter.patch("/:id", requireRole("admin", "fleet_manager"), async (req, res) => {
  const parsed = updateVehicleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Vehicle not found" });

  const { driverId, ...data } = parsed.data;
  const vehicle = await prisma.vehicle.update({ where: { id: req.params.id }, data });
  await assignDriverToVehicle(vehicle.id, driverId);

  const withDriver = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicle.id }, include: { driver: true } });
  res.json(toSharedVehicle(withDriver));
});

vehiclesRouter.delete("/:id", requireRole("admin", "fleet_manager"), async (req, res) => {
  const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Vehicle not found" });

  await prisma.driver.updateMany({ where: { assignedVehicleId: existing.id }, data: { assignedVehicleId: null } });
  await prisma.alertThreshold.deleteMany({ where: { vehicleId: existing.id } });
  await prisma.vehicleStatus.deleteMany({ where: { vehicleId: existing.id } });
  await prisma.alert.deleteMany({ where: { vehicleId: existing.id } });
  await prisma.telemetryPing.deleteMany({ where: { vehicleId: existing.id } });
  await prisma.vehicle.delete({ where: { id: existing.id } });

  res.status(204).send();
});
