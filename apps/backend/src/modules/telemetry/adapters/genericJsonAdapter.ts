// Adapter for devices/simulators that already speak our normalized JSON
// shape. A real GT06 or JT808 adapter would live alongside this file,
// parsing the vendor's binary frame format into the same NormalizedPing
// shape — the ingestion route and everything downstream (status derivation,
// alert rules, persistence) stays protocol-agnostic and only depends on
// that normalized output, never on a specific wire format.
import { normalizedPingSchema, type NormalizedPing } from "../telemetry.schema.js";

export function parseGenericJsonPacket(raw: unknown): NormalizedPing {
  return normalizedPingSchema.parse(raw);
}
