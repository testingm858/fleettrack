import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { AlertThresholds, Vehicle } from "@fleettrack/shared-types";
import { getVehicleThresholds, getVehicles, updateVehicleThresholds } from "../../lib/api";
import { colors } from "../../theme/colors";

export function ThresholdsSettings() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [thresholds, setThresholds] = useState<AlertThresholds | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getVehicles().then((v) => {
      setVehicles(v);
      if (v[0]) setSelectedId(v[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedId) getVehicleThresholds(selectedId).then(setThresholds);
  }, [selectedId]);

  async function handleSave() {
    if (!thresholds) return;
    const updated = await updateVehicleThresholds(selectedId, {
      speedLimitKmh: thresholds.speedLimitKmh,
      idleThresholdSeconds: thresholds.idleThresholdSeconds,
      lowBatteryPct: thresholds.lowBatteryPct,
      offlineTimeoutSeconds: thresholds.offlineTimeoutSeconds,
    });
    setThresholds(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Alert Thresholds</Text>
      <Text style={styles.subtitle}>Per-vehicle limits used by the alert-rule engine.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {vehicles.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[styles.chip, selectedId === v.id && styles.chipActive]}
              onPress={() => setSelectedId(v.id)}
            >
              <Text style={[styles.chipText, selectedId === v.id && styles.chipTextActive]}>{v.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {thresholds && (
        <>
          <Field label="Speed limit (km/h)" value={thresholds.speedLimitKmh} onChange={(n) => setThresholds({ ...thresholds, speedLimitKmh: n })} />
          <Field label="Idle threshold (seconds)" value={thresholds.idleThresholdSeconds} onChange={(n) => setThresholds({ ...thresholds, idleThresholdSeconds: n })} />
          <Field label="Low battery (%)" value={thresholds.lowBatteryPct} onChange={(n) => setThresholds({ ...thresholds, lowBatteryPct: n })} />
          <Field label="Offline timeout (seconds)" value={thresholds.offlineTimeoutSeconds} onChange={(n) => setThresholds({ ...thresholds, offlineTimeoutSeconds: n })} />

          <View style={styles.row}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
            {saved && <Text style={styles.savedText}>Saved</Text>}
          </View>
        </>
      )}
    </View>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={String(value)}
        onChangeText={(t) => onChange(Number(t) || 0)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16 },
  title: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}26` },
  chipText: { color: colors.muted, fontSize: 12 },
  chipTextActive: { color: colors.primary },
  label: { color: colors.muted, fontSize: 11, marginBottom: 4 },
  input: { height: 40, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 10, color: colors.foreground },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  saveButton: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 20 },
  saveText: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
  savedText: { color: colors.statusRunning, fontSize: 12 },
});
