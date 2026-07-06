import type { Ionicons } from "@expo/vector-icons";
import type { AlertType } from "@fleettrack/shared-types";
import { colors } from "../theme/colors";

export const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  ignition_on: { label: "Ignition On", icon: "key", color: colors.statusRunning },
  ignition_off: { label: "Ignition Off", icon: "key", color: colors.statusStopped },
  zone_in: { label: "Zone In", icon: "log-in", color: colors.statusOffline },
  zone_out: { label: "Zone Out", icon: "log-out", color: colors.statusIdle },
  power_alert: { label: "Power Alert", icon: "flash", color: colors.statusIdle },
  overspeed: { label: "Overspeed", icon: "speedometer", color: colors.statusStopped },
  harsh_braking: { label: "Harsh Braking", icon: "warning", color: colors.statusStopped },
  sos: { label: "SOS", icon: "alert-circle", color: colors.statusStopped },
  low_battery: { label: "Low Battery", icon: "battery-dead", color: colors.statusIdle },
  geofence_violation: { label: "Geofence Violation", icon: "shield", color: colors.statusStopped },
  idle_time_exceeded: { label: "Idle Time Exceeded", icon: "time", color: colors.statusIdle },
};
