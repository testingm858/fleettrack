import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { VehicleStatusValue } from "@fleettrack/shared-types";
import { colors } from "../theme/colors";

// Color alone never carries meaning: each status also ships an icon and
// text label so colorblind users aren't relying on color-coding.
const STATUS_CONFIG: Record<
  VehicleStatusValue,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  running: { label: "Running", color: colors.statusRunning, icon: "ellipse" },
  stopped: { label: "Stopped", color: colors.statusStopped, icon: "square" },
  idle: { label: "Idle", color: colors.statusIdle, icon: "pause" },
  offline: { label: "Offline", color: colors.statusOffline, icon: "cloud-offline-outline" },
};

export function StatusBadge({ status }: { status: VehicleStatusValue }) {
  const { label, color, icon } = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}26` }]}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: { fontSize: 11, fontWeight: "600" },
});
