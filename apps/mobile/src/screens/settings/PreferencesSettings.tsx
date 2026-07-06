import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { UnitPreferences } from "@fleettrack/shared-types";
import { getPreferences, updatePreferences } from "../../lib/api";
import { colors } from "../../theme/colors";

export function PreferencesSettings() {
  const [units, setUnits] = useState<UnitPreferences | null>(null);

  useEffect(() => {
    getPreferences().then((p) => setUnits(p.units));
  }, []);

  async function update<K extends keyof UnitPreferences>(key: K, value: UnitPreferences[K]) {
    if (!units) return;
    const next = { ...units, [key]: value };
    setUnits(next);
    await updatePreferences({ units: next });
  }

  if (!units) return <Text style={styles.message}>Loading preferences…</Text>;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Preferences</Text>
      <Text style={styles.subtitle}>Saved to your account.</Text>

      <Text style={styles.label}>Distance unit</Text>
      <View style={styles.row}>
        {(["km", "mi"] as const).map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, units.distanceUnit === opt && styles.chipActive]}
            onPress={() => update("distanceUnit", opt)}
          >
            <Text style={[styles.chipText, units.distanceUnit === opt && styles.chipTextActive]}>
              {opt === "km" ? "Kilometers" : "Miles"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Time format</Text>
      <View style={styles.row}>
        {(["12h", "24h"] as const).map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, units.timeFormat === opt && styles.chipActive]}
            onPress={() => update("timeFormat", opt)}
          >
            <Text style={[styles.chipText, units.timeFormat === opt && styles.chipTextActive]}>
              {opt === "12h" ? "12-hour" : "24-hour"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.note}>
        Note: saved but not yet applied to displays elsewhere in the app — that wiring lands in a later pass.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16 },
  title: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, marginBottom: 10 },
  label: { color: colors.muted, fontSize: 11, marginTop: 10, marginBottom: 6 },
  row: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}26` },
  chipText: { color: colors.muted, fontSize: 12 },
  chipTextActive: { color: colors.primary },
  note: { color: colors.muted, fontSize: 10, marginTop: 14 },
  message: { color: colors.muted, textAlign: "center", marginTop: 16 },
});
