import { Router } from "express";
import type { Driver as SharedDriver } from "@fleettrack/shared-types";
import { prisma } from "../../db/prisma.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { createDriverSchema, updateDriverSchema } from "./drivers.schema.js";

export const driversRouter = Router();

driversRouter.use(requireAuth, requireRole("admin", "fleet_manager"));

function toSharedDriver(driver: {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  assignedVehicleId: string | null;
}): SharedDriver {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    licenseNumber: driver.licenseNumber,
    assignedVehicleId: driver.assignedVehicleId,
  };
}

// A vehicle can only have one driver — releasing it here mirrors the same
// invariant the vehicles module enforces from the other direction.
async function releaseVehicleFromOtherDrivers(vehicleId: string, exceptDriverId: string) {
  await prisma.driver.updateMany({
    where: { assignedVehicleId: vehicleId, NOT: { id: exceptDriverId } },
    data: { assignedVehicleId: null },
  });
}

driversRouter.get("/", async (_req, res) => {
  const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });
  res.json(drivers.map(toSharedDriver));
});

driversRouter.get("/:id", async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  res.json(toSharedDriver(driver));
});

driversRouter.post("/", async (req, res) => {
  const parsed = createDriverSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { assignedVehicleId, ...data } = parsed.data;
  const driver = await prisma.driver.create({ data });

  if (assignedVehicleId) {
    await releaseVehicleFromOtherDrivers(assignedVehicleId, driver.id);
    await prisma.driver.update({ where: { id: driver.id }, data: { assignedVehicleId } });
  }

  const result = await prisma.driver.findUniqueOrThrow({ where: { id: driver.id } });
  res.status(201).json(toSharedDriver(result));
});

driversRouter.patch("/:id", async (req, res) => {
  const parsed = updateDriverSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.driver.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Driver not found" });

  const { assignedVehicleId, ...data } = parsed.data;
  if (assignedVehicleId !== undefined && assignedVehicleId) {
    await releaseVehicleFromOtherDrivers(assignedVehicleId, existing.id);
  }

  const driver = await prisma.driver.update({
    where: { id: req.params.id },
    data: { ...data, ...(assignedVehicleId !== undefined ? { assignedVehicleId } : {}) },
  });
  res.json(toSharedDriver(driver));
});

driversRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.driver.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Driver not found" });

  await prisma.driver.delete({ where: { id: existing.id } });
  res.status(204).send();
});
