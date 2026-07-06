import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Vehicle, VehicleType } from "@fleettrack/shared-types";
import { createVehicle, deleteVehicle, getDrivers, getVehicles, updateVehicle } from "../../lib/api";
import { colors } from "../../theme/colors";

const VEHICLE_TYPES: VehicleType[] = ["car", "bike", "truck"];

interface FormState {
  id: string | null;
  name: string;
  plateNumber: string;
  type: VehicleType;
  imei: string;
  driverId: string;
}

const EMPTY_FORM: FormState = { id: null, name: "", plateNumber: "", type: "car", imei: "", driverId: "" };

export function VehiclesSettings() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getVehicles().then(setVehicles);
    getDrivers().then((d) => setDrivers(d.map((driver) => ({ id: driver.id, name: driver.name }))));
  }

  useEffect(refresh, []);

  async function handleSubmit() {
    if (!form) return;
    setError(null);
    const payload = {
      name: form.name,
      plateNumber: form.plateNumber,
      type: form.type,
      imei: form.imei,
      iconType: form.type,
      driverId: form.driverId || null,
    };
    try {
      if (form.id) await updateVehicle(form.id, payload);
      else await createVehicle(payload);
      setForm(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vehicle");
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Vehicles</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setForm(EMPTY_FORM)}>
          <Ionicons name="add" size={16} color={colors.foreground} />
          <Text style={styles.addButtonText}>Add vehicle</Text>
        </TouchableOpacity>
      </View>

      {form && (
        <View style={styles.card}>
          <Text style={styles.title}>{form.id ? "Edit vehicle" : "New vehicle"}</Text>
          <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.muted} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
          <TextInput style={styles.input} placeholder="Plate number" placeholderTextColor={colors.muted} value={form.plateNumber} onChangeText={(t) => setForm({ ...form, plateNumber: t })} />
          <TextInput style={styles.input} placeholder="IMEI" placeholderTextColor={colors.muted} value={form.imei} onChangeText={(t) => setForm({ ...form, imei: t })} />
          <View style={styles.row}>
            {VEHICLE_TYPES.map((t) => (
              <TouchableOpacity key={t} style={[styles.chip, form.type === t && styles.chipActive]} onPress={() => setForm({ ...form, type: t })}>
                <Text style={[styles.chipText, form.type === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.chip, !form.driverId && styles.chipActive]} onPress={() => setForm({ ...form, driverId: "" })}>
              <Text style={[styles.chipText, !form.driverId && styles.chipTextActive]}>No driver</Text>
            </TouchableOpacity>
            {drivers.map((d) => (
              <TouchableOpacity key={d.id} style={[styles.chip, form.driverId === d.id && styles.chipActive]} onPress={() => setForm({ ...form, driverId: d.id })}>
                <Text style={[styles.chipText, form.driverId === d.id && styles.chipTextActive]}>{d.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setForm(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {vehicles.map((v) => (
        <View key={v.id} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{v.name}</Text>
            <Text style={styles.itemMeta}>
              {v.plateNumber} · {v.type} · {drivers.find((d) => d.id === v.driverId)?.name ?? "No driver"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setForm({ id: v.id, name: v.name, plateNumber: v.plateNumber, type: v.type, imei: v.imei, driverId: v.driverId ?? "" })}>
            <Ionicons name="pencil" size={16} color={colors.muted} style={{ marginRight: 12 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteVehicle(v.id).then(refresh)}>
            <Ionicons name="trash" size={16} color={colors.statusStopped} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  addButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  addButtonText: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 8 },
  title: { color: colors.foreground, fontSize: 13, fontWeight: "700" },
  input: { height: 40, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 10, color: colors.foreground },
  row: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}26` },
  chipText: { color: colors.muted, fontSize: 11 },
  chipTextActive: { color: colors.primary },
  error: { color: colors.statusStopped, fontSize: 11 },
  formActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  cancelButton: { flex: 1, alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 8 },
  cancelText: { color: colors.foreground, fontSize: 12 },
  saveButton: { flex: 1, alignItems: "center", backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 8 },
  saveText: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
  itemCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
  itemTitle: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
  itemMeta: { color: colors.muted, fontSize: 11 },
});
