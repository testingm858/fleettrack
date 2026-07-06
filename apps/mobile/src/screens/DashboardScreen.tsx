import { useEffect, useMemo, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { AlertSummary, AlertType } from "@fleettrack/shared-types";
import { useFleet } from "../hooks/useFleet";
import { getAlertSummary } from "../lib/api";
import { ALERT_TYPE_CONFIG } from "../lib/alertTypes";
import { DonutChart } from "../components/DonutChart";
import { colors } from "../theme/colors";

type RangeValue = "today" | "7d" | "30d";

const RANGES: { value: RangeValue; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

const ALERT_TILES: { label: string; types: AlertType[] }[] = [
  { label: "Zone In", types: ["zone_in"] },
  { label: "Zone Out", types: ["zone_out"] },
  { label: "Ignition Alert", types: ["ignition_on", "ignition_off"] },
  { label: "Power Alert", types: ["power_alert"] },
  { label: "Overspeed", types: ["overspeed"] },
  { label: "Harsh Braking", types: ["harsh_braking"] },
  { label: "SOS / Panic", types: ["sos"] },
  { label: "Low Battery", types: ["low_battery"] },
  { label: "Geofence Violation", types: ["geofence_violation"] },
  { label: "Idle Time Exceeded", types: ["idle_time_exceeded"] },
];

function rangeToFrom(range: RangeValue): string {
  const now = new Date();
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }
  if (range === "7d") return new Date(now.getTime() - 7 * 86400000).toISOString();
  return new Date(now.getTime() - 30 * 86400000).toISOString();
}

export function DashboardScreen() {
  const { fleet } = useFleet();
  const navigation = useNavigation<any>();
  const [range, setRange] = useState<RangeValue>("7d");
  const [summary, setSummary] = useState<AlertSummary>({ total: 0, byType: {} });

  const counts = useMemo(() => {
    const result = { running: 0, stopped: 0, idle: 0, offline: 0 };
    for (const v of fleet) {
      const status = v.status?.currentStatus ?? "offline";
      result[status] += 1;
    }
    return result;
  }, [fleet]);

  useEffect(() => {
    getAlertSummary({ from: rangeToFrom(range) })
      .then(setSummary)
      .catch(() => setSummary({ total: 0, byType: {} }));
  }, [range]);

  function tileCount(types: AlertType[]): number {
    return types.reduce((sum, t) => sum + (summary.byType[t] ?? 0), 0);
  }

  function handleShare() {
    const text = `Fleet update: ${fleet.length} vehicles — ${counts.running} running, ${counts.idle} idle, ${counts.stopped} stopped, ${counts.offline} offline. ${summary.total} alerts in range.`;
    Share.share({ message: text });
  }

  function goToStatus(filter: string) {
    navigation.navigate("Status", { filter });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.chipRow}>
        {RANGES.map(({ value, label }) => (
          <TouchableOpacity
            key={value}
            onPress={() => setRange(value)}
            style={[styles.chip, range === value && styles.chipActive]}
          >
            <Text style={[styles.chipText, range === value && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.donutRow}>
          <DonutChart
            centerLabel="Vehicles"
            segments={[
              { label: "Running", value: counts.running, color: colors.statusRunning },
              { label: "Idle", value: counts.idle, color: colors.statusIdle },
              { label: "Stopped", value: counts.stopped, color: colors.statusStopped },
              { label: "Offline", value: counts.offline, color: colors.statusOffline },
            ]}
          />
          <Text style={styles.summaryText}>
            Fleet update: {fleet.length} vehicles — {counts.running} running, {counts.idle} idle, {counts.stopped}{" "}
            stopped, {counts.offline} offline.
          </Text>
        </View>
      </View>

      <View style={styles.pillGrid}>
        {(
          [
            { label: "Running", value: counts.running, filter: "running" },
            { label: "Idle", value: counts.idle, filter: "idle" },
            { label: "Stopped", value: counts.stopped, filter: "stopped" },
            { label: "Offline", value: counts.offline, filter: "offline" },
          ] as const
        ).map((pill) => (
          <TouchableOpacity key={pill.filter} style={styles.pill} onPress={() => goToStatus(pill.filter)}>
            <Text style={styles.pillValue}>{pill.value}</Text>
            <Text style={styles.pillLabel}>{pill.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Alerts</Text>
            <Text style={styles.cardSubtitle}>{summary.total} total in range</Text>
          </View>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
        <View style={styles.tileGrid}>
          {ALERT_TILES.map(({ label, types }) => (
            <View key={label} style={styles.tile}>
              <Text style={styles.tileValue}>{tileCount(types)}</Text>
              <Text style={styles.tileLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}26` },
  chipText: { color: colors.muted, fontSize: 12 },
  chipTextActive: { color: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
  donutRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryText: { flex: 1, color: colors.muted, fontSize: 12 },
  pillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    width: "47%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  pillValue: { color: colors.foreground, fontSize: 18, fontWeight: "700" },
  pillLabel: { color: colors.muted, fontSize: 11 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardTitle: { color: colors.foreground, fontSize: 14, fontWeight: "600" },
  cardSubtitle: { color: colors.muted, fontSize: 11 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    width: "30%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
  },
  tileValue: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  tileLabel: { color: colors.muted, fontSize: 9, textAlign: "center", marginTop: 2 },
});
