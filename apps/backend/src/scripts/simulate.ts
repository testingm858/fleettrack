// Fake GPS ping generator so the whole stack is testable without real
// hardware. Reads registered vehicles straight from the DB (this is a
// trusted dev-only script, not a client of the public API) and POSTs
// normalized pings to the same ingestion endpoint real trackers would hit.
import { prisma } from "../db/prisma.js";
import { env } from "../env.js";

const TICK_INTERVAL_MS = Number(process.env.SIM_TICK_MS ?? 5000);
// Virtual clock runs faster than real time so threshold-based behavior
// (5-minute idle threshold, 30-minute offline timeout) is actually
// observable in a short demo session instead of requiring a real wait.
const TIME_ACCELERATION = Number(process.env.SIM_TIME_ACCELERATION ?? 12);

const INGEST_URL = `http://localhost:${env.port}/api/telemetry/ingest`;

type Mode = "driving" | "idling" | "parked";

interface SimVehicle {
  id: string;
  imei: string;
  plateNumber: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  ignition: boolean;
  immobilizer: boolean;
  charging: boolean;
  batteryPct: number;
  satelliteCount: number;
  rssiPct: number;
  odometerKm: number;
  mode: Mode;
  modeTicksRemaining: number;
  isZoneDemoVehicle: boolean;
  zoneAngle: number;
}

const DUBAI_CENTER = { lat: 25.2048, lng: 55.2708 };
// Matches the sample "Warehouse Zone" circle geofence created during API
// verification (center 25.2,55.27, radius 500m) so one vehicle visibly
// crosses it and exercises the zone_in/zone_out alert rules.
const ZONE_CENTER = { lat: 25.2, lng: 55.27 };

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickMode(previous: Mode): { mode: Mode; ticks: number } {
  const roll = Math.random();
  if (previous === "parked") {
    return roll < 0.4 ? { mode: "driving", ticks: randomBetween(6, 20) } : { mode: "parked", ticks: randomBetween(3, 10) };
  }
  if (previous === "driving") {
    if (roll < 0.15) return { mode: "idling", ticks: randomBetween(3, 8) };
    if (roll < 0.25) return { mode: "parked", ticks: randomBetween(5, 15) };
    return { mode: "driving", ticks: randomBetween(6, 20) };
  }
  // idling
  if (roll < 0.6) return { mode: "driving", ticks: randomBetween(6, 20) };
  if (roll < 0.8) return { mode: "idling", ticks: randomBetween(3, 8) };
  return { mode: "parked", ticks: randomBetween(5, 15) };
}

function stepPosition(v: SimVehicle, dtHours: number) {
  v.heading = (v.heading + randomBetween(-20, 20) + 360) % 360;
  const distanceKm = v.speed * dtHours;
  const dLat = (distanceKm / 111) * Math.cos((v.heading * Math.PI) / 180);
  const dLng = (distanceKm / (111 * Math.cos((v.lat * Math.PI) / 180))) * Math.sin((v.heading * Math.PI) / 180);
  v.lat += dLat;
  v.lng += dLng;
  v.odometerKm += distanceKm;
}

// Oscillates the vehicle's distance from ZONE_CENTER between ~300m and
// ~700m so it reliably crosses the 500m geofence boundary every cycle,
// independent of its driving/idling/parked mode.
function stepZoneDemoPosition(v: SimVehicle) {
  v.zoneAngle += 0.15;
  const radiusMeters = 500 + Math.sin(v.zoneAngle) * 220;
  const bearing = v.zoneAngle * 3;
  const radiusDeg = radiusMeters / 111000;
  v.lat = ZONE_CENTER.lat + radiusDeg * Math.cos(bearing);
  v.lng = ZONE_CENTER.lng + radiusDeg * Math.sin(bearing) / Math.cos((ZONE_CENTER.lat * Math.PI) / 180);
  v.heading = ((bearing * 180) / Math.PI + 90) % 360;
}

function tick(v: SimVehicle, dtHours: number) {
  if (v.modeTicksRemaining <= 0) {
    const next = pickMode(v.mode);
    v.mode = next.mode;
    v.modeTicksRemaining = next.ticks;
  }
  v.modeTicksRemaining -= 1;

  v.ignition = v.mode !== "parked";
  v.charging = v.mode === "parked";

  if (v.mode === "driving") {
    const overspeeding = Math.random() < 0.08;
    v.speed = overspeeding ? randomBetween(130, 160) : randomBetween(20, 80);
  } else {
    v.speed = 0;
  }

  if (v.isZoneDemoVehicle) {
    stepZoneDemoPosition(v);
  } else if (v.mode === "driving") {
    stepPosition(v, dtHours);
  }

  if (v.charging) {
    v.batteryPct = Math.min(100, v.batteryPct + 1.2);
  } else {
    const drainRate = v.mode === "driving" ? 0.35 : 0.12;
    v.batteryPct = Math.max(0, v.batteryPct - drainRate);
  }

  v.satelliteCount = Math.random() < 0.9 ? Math.round(randomBetween(7, 14)) : Math.round(randomBetween(3, 6));
  v.rssiPct = Math.round(randomBetween(40, 95));
}

async function postPing(v: SimVehicle, timestamp: Date) {
  const body = {
    imei: v.imei,
    lat: v.lat,
    lng: v.lng,
    speed: Math.round(v.speed * 10) / 10,
    heading: Math.round(v.heading),
    ignition: v.ignition,
    immobilizer: v.immobilizer,
    charging: v.charging,
    batteryPct: Math.round(v.batteryPct * 10) / 10,
    satelliteCount: v.satelliteCount,
    rssiPct: v.rssiPct,
    odometerKm: Math.round(v.odometerKm * 10) / 10,
    timestamp: timestamp.toISOString(),
  };

  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ingest-key": env.ingestApiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`[simulate] ${v.plateNumber} ingest failed: ${res.status} ${await res.text()}`);
    return;
  }

  const result = (await res.json()) as { status: { currentStatus: string }; alerts: { type: string }[] };
  const alertSummary = result.alerts.length ? ` alerts=[${result.alerts.map((a) => a.type).join(", ")}]` : "";
  console.log(
    `[simulate] ${v.plateNumber} mode=${v.mode} status=${result.status.currentStatus} speed=${body.speed}km/h battery=${body.batteryPct}%${alertSummary}`,
  );
}

async function main() {
  const vehicles = await prisma.vehicle.findMany();
  if (vehicles.length === 0) {
    console.error("No vehicles found — run `npm run prisma:seed` first.");
    process.exit(1);
  }

  const simVehicles: SimVehicle[] = vehicles.map((vehicle, i) => ({
    id: vehicle.id,
    imei: vehicle.imei,
    plateNumber: vehicle.plateNumber,
    lat: DUBAI_CENTER.lat + randomBetween(-0.05, 0.05),
    lng: DUBAI_CENTER.lng + randomBetween(-0.05, 0.05),
    heading: randomBetween(0, 360),
    speed: 0,
    ignition: false,
    immobilizer: false,
    charging: true,
    batteryPct: randomBetween(60, 100),
    satelliteCount: 10,
    rssiPct: 80,
    odometerKm: randomBetween(1000, 50000),
    mode: "parked",
    modeTicksRemaining: 0,
    isZoneDemoVehicle: i === 0,
    zoneAngle: 0,
  }));

  console.log(
    `[simulate] Simulating ${simVehicles.length} vehicles, ticking every ${TICK_INTERVAL_MS}ms at ${TIME_ACCELERATION}x virtual speed.`,
  );
  console.log(`[simulate] "${simVehicles[0].plateNumber}" orbits the Warehouse Zone geofence to demo zone_in/zone_out.`);

  let virtualClockMs = Date.now();
  const dtHours = (TICK_INTERVAL_MS * TIME_ACCELERATION) / 1000 / 3600;

  setInterval(() => {
    virtualClockMs += TICK_INTERVAL_MS * TIME_ACCELERATION;
    const timestamp = new Date(virtualClockMs);

    for (const v of simVehicles) {
      tick(v, dtHours);
      postPing(v, timestamp).catch((err) => console.error(`[simulate] ${v.plateNumber} error:`, err));
    }
  }, TICK_INTERVAL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
