import { z } from "zod";

// The normalized shape every protocol adapter must produce, regardless of
// what the wire format looks like (JSON from the simulator today; binary
// GT06/JT808 frames from real hardware later).
export const normalizedPingSchema = z.object({
  imei: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  speed: z.number().min(0),
  heading: z.number().min(0).max(360),
  ignition: z.boolean(),
  immobilizer: z.boolean(),
  charging: z.boolean(),
  batteryPct: z.number().min(0).max(100),
  satelliteCount: z.number().int().min(0),
  rssiPct: z.number().int().min(0).max(100),
  odometerKm: z.number().min(0),
  timestamp: z.string().datetime().optional(),
});

export type NormalizedPing = z.infer<typeof normalizedPingSchema>;
