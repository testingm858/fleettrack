import type { AlertType, Geofence, LatLng, VehicleStatusValue } from "@fleettrack/shared-types";
import { isInsideGeofence } from "./geo.js";

export interface PreviousState {
  ignition: boolean;
  charging: boolean;
  batteryPct: number;
  currentStatus: VehicleStatusValue;
  lastLocation: LatLng | null;
}

export interface NewPingState {
  ignition: boolean;
  charging: boolean;
  batteryPct: number;
  speed: number;
  location: LatLng;
  derivedStatus: VehicleStatusValue;
}

export interface AlertThresholdsInput {
  speedLimitKmh: number;
  lowBatteryPct: number;
}

// Every rule fires on a *transition*, never on sustained state, so a vehicle
// idling for an hour produces one idle_time_exceeded alert rather than one
// per ping. Geofence rules need the vehicle's previous location to detect a
// crossing; on the very first ping (lastLocation is null) no zone alerts
// fire since there's nothing to have crossed from.
export function evaluateAlerts(
  previous: PreviousState,
  next: NewPingState,
  thresholds: AlertThresholdsInput,
  assignedGeofences: Geofence[],
): AlertType[] {
  const alerts: AlertType[] = [];

  if (!previous.ignition && next.ignition) alerts.push("ignition_on");
  if (previous.ignition && !next.ignition) alerts.push("ignition_off");

  if (previous.charging && !next.charging) alerts.push("power_alert");

  if (next.speed > thresholds.speedLimitKmh) alerts.push("overspeed");

  const wasLowBattery = previous.batteryPct < thresholds.lowBatteryPct;
  const isLowBattery = next.batteryPct < thresholds.lowBatteryPct;
  if (!wasLowBattery && isLowBattery) alerts.push("low_battery");

  if (previous.currentStatus !== "idle" && next.derivedStatus === "idle") {
    alerts.push("idle_time_exceeded");
  }

  if (previous.lastLocation) {
    for (const geofence of assignedGeofences) {
      const wasInside = isInsideGeofence(previous.lastLocation, geofence);
      const isInside = isInsideGeofence(next.location, geofence);
      if (!wasInside && isInside && geofence.alertOnEntry) alerts.push("zone_in");
      if (wasInside && !isInside && geofence.alertOnExit) alerts.push("zone_out");
    }
  }

  return alerts;
}
