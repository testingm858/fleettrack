import { prisma } from "../db/prisma.js";
import { CHANNELS, pubsub } from "../realtime/pubsub.js";
import { toSharedVehicleStatus } from "../modules/telemetry/telemetry.service.js";
import { DEFAULT_ALERT_THRESHOLDS } from "@fleettrack/shared-types";

const SWEEP_INTERVAL_MS = 15_000;

// Offline is the one status that isn't decided by an incoming ping — it's
// the absence of pings over time — so it needs its own periodic sweep
// rather than being derived inline during ingestion.
async function sweepOfflineVehicles() {
  const statuses = await prisma.vehicleStatus.findMany({
    where: { currentStatus: { not: "offline" } },
    include: { vehicle: { include: { thresholds: true } } },
  });

  const now = Date.now();

  for (const status of statuses) {
    const timeoutSeconds = status.vehicle.thresholds?.offlineTimeoutSeconds ?? DEFAULT_ALERT_THRESHOLDS.offlineTimeoutSeconds;
    const lastPingMs = status.lastPing?.getTime() ?? 0;

    if (now - lastPingMs > timeoutSeconds * 1000) {
      const updated = await prisma.vehicleStatus.update({
        where: { vehicleId: status.vehicleId },
        data: { currentStatus: "offline" },
      });
      pubsub.publish(CHANNELS.vehicleStatusUpdated, toSharedVehicleStatus(updated));
    }
  }
}

export function startOfflineCheckJob() {
  const interval = setInterval(() => {
    sweepOfflineVehicles().catch((err) => console.error("Offline sweep failed:", err));
  }, SWEEP_INTERVAL_MS);

  return () => clearInterval(interval);
}
