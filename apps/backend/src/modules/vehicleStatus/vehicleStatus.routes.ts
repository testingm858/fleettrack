import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { requireAuth, type AuthedRequest } from "../auth/auth.middleware.js";
import { toSharedVehicleStatus } from "../telemetry/telemetry.service.js";

export const vehicleStatusRouter = Router();

vehicleStatusRouter.use(requireAuth);

async function resolveOwnVehicleId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { driver: true } });
  return user?.driver?.assignedVehicleId ?? null;
}

vehicleStatusRouter.get("/", async (req: AuthedRequest, res) => {
  if (req.user!.role === "driver") {
    const ownVehicleId = await resolveOwnVehicleId(req.user!.sub);
    if (!ownVehicleId) return res.json([]);
    const status = await prisma.vehicleStatus.findUnique({ where: { vehicleId: ownVehicleId } });
    return res.json(status ? [toSharedVehicleStatus(status)] : []);
  }

  const statuses = await prisma.vehicleStatus.findMany();
  res.json(statuses.map(toSharedVehicleStatus));
});

vehicleStatusRouter.get("/:vehicleId", async (req: AuthedRequest, res) => {
  if (req.user!.role === "driver") {
    const ownVehicleId = await resolveOwnVehicleId(req.user!.sub);
    if (req.params.vehicleId !== ownVehicleId) return res.status(403).json({ error: "Insufficient permissions" });
  }

  const status = await prisma.vehicleStatus.findUnique({ where: { vehicleId: req.params.vehicleId } });
  if (!status) return res.status(404).json({ error: "No status recorded for this vehicle" });
  res.json(toSharedVehicleStatus(status));
});
