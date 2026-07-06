import {
  BatteryLow,
  Gauge,
  KeyRound,
  Clock,
  LogIn,
  LogOut,
  ShieldAlert,
  Siren,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { AlertType } from "@fleettrack/shared-types";

export const ALERT_TYPE_CONFIG: Record<
  AlertType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  ignition_on: { label: "Ignition On", icon: KeyRound, color: "text-status-running" },
  ignition_off: { label: "Ignition Off", icon: KeyRound, color: "text-status-stopped" },
  zone_in: { label: "Zone In", icon: LogIn, color: "text-status-offline" },
  zone_out: { label: "Zone Out", icon: LogOut, color: "text-status-idle" },
  power_alert: { label: "Power Alert", icon: Zap, color: "text-status-idle" },
  overspeed: { label: "Overspeed", icon: Gauge, color: "text-status-stopped" },
  harsh_braking: { label: "Harsh Braking", icon: TriangleAlert, color: "text-status-stopped" },
  sos: { label: "SOS", icon: Siren, color: "text-status-stopped" },
  low_battery: { label: "Low Battery", icon: BatteryLow, color: "text-status-idle" },
  geofence_violation: { label: "Geofence Violation", icon: ShieldAlert, color: "text-status-stopped" },
  idle_time_exceeded: { label: "Idle Time Exceeded", icon: Clock, color: "text-status-idle" },
};
