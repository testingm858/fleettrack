import type { Alert as SharedAlert, VehicleStatus as SharedVehicleStatus, Geofence } from "@fleettrack/shared-types";
import { DEFAULT_ALERT_THRESHOLDS } from "@fleettrack/shared-types";
import { prisma } from "../../db/prisma.js";
import { CHANNELS, pubsub } from "../../realtime/pubsub.js";
import { deriveStatus } from "./status.js";
import { evaluateAlerts } from "./alertRules.js";
import { reverseGeocode } from "./geocode.js";
import type { NormalizedPing } from "./telemetry.schema.js";
import { isHighPriorityAlert, notifyHighPriorityAlert } from "../push/push.service.js";

export class VehicleNotFoundError extends Error {
  constructor(imei: string) {
    super(`No vehicle registered with imei ${imei}`);
  }
}

// ingestPing does a read-then-write on VehicleStatus (to diff against the
// previous ping for alert transitions), which isn't safe under concurrent
// calls for the same vehicle — a retried or bursty packet could race and
// double-fire transition alerts. Chaining a promise per vehicleId forces
// same-vehicle pings to process strictly in sequence without blocking
// unrelated vehicles.
const vehicleQueues = new Map<string, Promise<unknown>>();

function serializedByVehicle<T>(vehicleId: string, fn: () => Promise<T>): Promise<T> {
  const previous = vehicleQueues.get(vehicleId) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  vehicleQueues.set(
    vehicleId,
    next.catch(() => undefined),
  );
  return next;
}

function toSharedVehicleStatus(row: {
  vehicleId: string;
  currentStatus: string;
  lastPing: Date | null;
  lastLat: number | null;
  lastLng: number | null;
  speed: number;
  heading: number;
  ignition: boolean;
  immobilizer: boolean;
  charging: boolean;
  batteryPct: number;
  satelliteCount: number;
  rssiPct: number;
  odometerKm: number;
  address: string | null;
}): SharedVehicleStatus {
  return {
    vehicleId: row.vehicleId,
    currentStatus: row.currentStatus as SharedVehicleStatus["currentStatus"],
    lastPing: row.lastPing?.toISOString() ?? null,
    lastKnownLocation: row.lastLat != null && row.lastLng != null ? { lat: row.lastLat, lng: row.lastLng } : null,
    speed: row.speed,
    heading: row.heading,
    ignition: row.ignition,
    immobilizer: row.immobilizer,
    charging: row.charging,
    batteryPct: row.batteryPct,
    satelliteCount: row.satelliteCount,
    rssiPct: row.rssiPct,
    odometerKm: row.odometerKm,
    address: row.address,
  };
}

async function getAssignedGeofences(vehicleId: string): Promise<Geofence[]> {
  const rows = await prisma.geofence.findMany();
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      shape: row.shape as Geofence["shape"],
      coordinates: JSON.parse(row.coordinatesJson),
      radiusMeters: row.radiusMeters,
      alertOnEntry: row.alertOnEntry,
      alertOnExit: row.alertOnExit,
      assignedVehicleIds: JSON.parse(row.assignedVehicleIdsJson) as string[],
    }))
    .filter((geofence) => geofence.assignedVehicleIds.includes(vehicleId));
}

export interface IngestResult {
  status: SharedVehicleStatus;
  alerts: SharedAlert[];
}

export async function ingestPing(ping: NormalizedPing): Promise<IngestResult> {
  const vehicle = await prisma.vehicle.findUnique({ where: { imei: ping.imei } });
  if (!vehicle) throw new VehicleNotFoundError(ping.imei);

  return serializedByVehicle(vehicle.id, () => processPing(vehicle.id, ping));
}

async function processPing(vehicleId: string, ping: NormalizedPing): Promise<IngestResult> {
  const vehicle = { id: vehicleId };
  const [previousStatus, thresholdsRow, assignedGeofences] = await Promise.all([
    prisma.vehicleStatus.findUnique({ where: { vehicleId: vehicle.id } }),
    prisma.alertThreshold.findUnique({ where: { vehicleId: vehicle.id } }),
    getAssignedGeofences(vehicle.id),
  ]);

  const thresholds = thresholdsRow ?? { ...DEFAULT_ALERT_THRESHOLDS, vehicleId: vehicle.id };
  const timestamp = ping.timestamp ? new Date(ping.timestamp) : new Date();

  const { status: derivedStatus, movementStoppedAt } = deriveStatus({
    ignition: ping.ignition,
    speed: ping.speed,
    previousMovementStoppedAt: previousStatus?.movementStoppedAt ?? null,
    idleThresholdSeconds: thresholds.idleThresholdSeconds,
    now: timestamp,
  });

  const address = await reverseGeocode(vehicle.id, ping.lat, ping.lng);

  const alertTypes = evaluateAlerts(
    {
      ignition: previousStatus?.ignition ?? false,
      charging: previousStatus?.charging ?? false,
      batteryPct: previousStatus?.batteryPct ?? 100,
      currentStatus: (previousStatus?.currentStatus as SharedVehicleStatus["currentStatus"]) ?? "offline",
      lastLocation:
        previousStatus?.lastLat != null && previousStatus?.lastLng != null
          ? { lat: previousStatus.lastLat, lng: previousStatus.lastLng }
          : null,
    },
    {
      ignition: ping.ignition,
      charging: ping.charging,
      batteryPct: ping.batteryPct,
      speed: ping.speed,
      location: { lat: ping.lat, lng: ping.lng },
      derivedStatus,
    },
    thresholds,
    assignedGeofences,
  );

  await prisma.telemetryPing.create({
    data: {
      vehicleId: vehicle.id,
      timestamp,
      lat: ping.lat,
      lng: ping.lng,
      speed: ping.speed,
      heading: ping.heading,
      ignition: ping.ignition,
      immobilizer: ping.immobilizer,
      charging: ping.charging,
      batteryPct: ping.batteryPct,
      satelliteCount: ping.satelliteCount,
      rssiPct: ping.rssiPct,
      odometerKm: ping.odometerKm,
      address,
    },
  });

  const statusRow = await prisma.vehicleStatus.upsert({
    where: { vehicleId: vehicle.id },
    update: {
      currentStatus: derivedStatus,
      lastPing: timestamp,
      lastLat: ping.lat,
      lastLng: ping.lng,
      movementStoppedAt,
      speed: ping.speed,
      heading: ping.heading,
      ignition: ping.ignition,
      immobilizer: ping.immobilizer,
      charging: ping.charging,
      batteryPct: ping.batteryPct,
      satelliteCount: ping.satelliteCount,
      rssiPct: ping.rssiPct,
      odometerKm: ping.odometerKm,
      address,
    },
    create: {
      vehicleId: vehicle.id,
      currentStatus: derivedStatus,
      lastPing: timestamp,
      lastLat: ping.lat,
      lastLng: ping.lng,
      movementStoppedAt,
      speed: ping.speed,
      heading: ping.heading,
      ignition: ping.ignition,
      immobilizer: ping.immobilizer,
      charging: ping.charging,
      batteryPct: ping.batteryPct,
      satelliteCount: ping.satelliteCount,
      rssiPct: ping.rssiPct,
      odometerKm: ping.odometerKm,
      address,
    },
  });

  const sharedStatus = toSharedVehicleStatus(statusRow);
  pubsub.publish(CHANNELS.vehicleStatusUpdated, sharedStatus);

  const alerts: SharedAlert[] = [];
  let vehicleName: string | null = null;
  for (const type of alertTypes) {
    const alertRow = await prisma.alert.create({
      data: { vehicleId: vehicle.id, type, timestamp, lat: ping.lat, lng: ping.lng, address },
    });
    const sharedAlert: SharedAlert = {
      id: alertRow.id,
      vehicleId: alertRow.vehicleId,
      type: alertRow.type as SharedAlert["type"],
      timestamp: alertRow.timestamp.toISOString(),
      lat: alertRow.lat,
      lng: alertRow.lng,
      address: alertRow.address,
      acknowledged: alertRow.acknowledged,
    };
    alerts.push(sharedAlert);
    pubsub.publish(CHANNELS.alertCreated, sharedAlert);

    if (isHighPriorityAlert(sharedAlert.type)) {
      vehicleName ??= (await prisma.vehicle.findUnique({ where: { id: vehicle.id }, select: { name: true } }))?.name ?? "Vehicle";
      await notifyHighPriorityAlert(sharedAlert, vehicleName);
    }
  }

  return { status: sharedStatus, alerts };
}

export { toSharedVehicleStatus };
