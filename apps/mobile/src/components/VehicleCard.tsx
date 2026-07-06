import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { FleetVehicle } from "../hooks/useFleet";
import { StatusBadge } from "./StatusBadge";
import { colors } from "../theme/colors";
import { batteryColor, formatRelativeTime } from "../lib/format";

const VEHICLE_ICONS = { car: "car", bike: "bike", truck: "truck" } as const;

function StatChip({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={color ?? colors.muted} />
      <Text style={[styles.chipLabel, color ? { color } : null]}>
        {label}: <Text style={[styles.chipValue, color ? { color } : null]}>{value}</Text>
      </Text>
    </View>
  );
}

export function VehicleCard({ vehicle, onPress }: { vehicle: FleetVehicle; onPress?: () => void }) {
  const status = vehicle.status;
  const battery = status?.batteryPct ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name={VEHICLE_ICONS[vehicle.type]} size={20} color={colors.muted} />
          <View>
            <Text style={styles.name}>{vehicle.name}</Text>
            <Text style={styles.plate}>{vehicle.plateNumber}</Text>
          </View>
        </View>
        <StatusBadge status={status?.currentStatus ?? "offline"} />
      </View>

      {status?.address && (
        <Text style={styles.address} numberOfLines={1}>
          {status.address}
        </Text>
      )}

      <View style={styles.statsGrid}>
        <StatChip icon="flash" label="Speed" value={`${status?.speed ?? 0} km/h`} />
        <StatChip icon="battery-half" label="Battery" value={`${battery}%`} color={batteryColor(battery, colors)} />
        <StatChip icon="cellular" label="Signal" value={`${status?.rssiPct ?? 0}%`} />
        <StatChip icon="navigate" label="Sats" value={`${status?.satelliteCount ?? 0}`} />
        <StatChip
          icon="power"
          label="Ignition"
          value={status?.ignition ? "On" : "Off"}
          color={status?.ignition ? colors.statusRunning : colors.statusStopped}
        />
        <StatChip
          icon="lock-closed"
          label="Immobilizer"
          value={status?.immobilizer ? "On" : "Off"}
          color={status?.immobilizer ? colors.statusIdle : undefined}
        />
      </View>

      <Text style={styles.updated}>Updated {formatRelativeTime(status?.lastPing ?? null)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  plate: { color: colors.muted, fontSize: 11 },
  address: { color: colors.muted, fontSize: 11 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, width: "45%" },
  chipLabel: { color: colors.muted, fontSize: 11 },
  chipValue: { color: colors.foreground, fontWeight: "600" },
  updated: { color: colors.muted, fontSize: 10, textAlign: "right" },
});
