import type { VehicleStatusValue } from "@fleettrack/shared-types";

export interface StatusInput {
  ignition: boolean;
  speed: number;
  /** VehicleStatus.movementStoppedAt from before this ping, if any. */
  previousMovementStoppedAt: Date | null;
  idleThresholdSeconds: number;
  now: Date;
}

export interface StatusResult {
  status: VehicleStatusValue;
  /** Next value to persist as VehicleStatus.movementStoppedAt. */
  movementStoppedAt: Date | null;
}

// Implements the business rules from the project brief:
//   Running: ignition ON and speed > 0
//   Idle: ignition ON and speed == 0 for longer than idleThresholdSeconds
//   Stopped: ignition OFF (and a ping was received, so it's not "offline")
// Offline is not decided here — it's a time-since-last-ping check handled by
// the background sweep in jobs/offlineCheck.ts, since it must fire even when
// no ping ever arrives.
export function deriveStatus(input: StatusInput): StatusResult {
  const { ignition, speed, previousMovementStoppedAt, idleThresholdSeconds, now } = input;

  if (!ignition) {
    return { status: "stopped", movementStoppedAt: null };
  }

  if (speed > 0) {
    return { status: "running", movementStoppedAt: null };
  }

  const stoppedAt = previousMovementStoppedAt ?? now;
  const idleSeconds = (now.getTime() - stoppedAt.getTime()) / 1000;
  const status: VehicleStatusValue = idleSeconds >= idleThresholdSeconds ? "idle" : "running";
  return { status, movementStoppedAt: stoppedAt };
}
