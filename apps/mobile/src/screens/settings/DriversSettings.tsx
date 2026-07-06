import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Driver } from "@fleettrack/shared-types";
import { createDriver, deleteDriver, getDrivers, updateDriver } from "../../lib/api";
import { colors } from "../../theme/colors";

interface FormState {
  id: string | null;
  name: string;
  phone: string;
  licenseNumber: string;
}

const EMPTY_FORM: FormState = { id: null, name: "", phone: "", licenseNumber: "" };

export function DriversSettings() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getDrivers().then(setDrivers);
  }

  useEffect(refresh, []);

  async function handleSubmit() {
    if (!form) return;
    setError(null);
    const payload = { name: form.name, phone: form.phone, licenseNumber: form.licenseNumber };
    try {
      if (form.id) await updateDriver(form.id, payload);
      else await createDriver(payload);
      setForm(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save driver");
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Drivers</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setForm(EMPTY_FORM)}>
          <Ionicons name="add" size={16} color={colors.foreground} />
          <Text style={styles.addButtonText}>Add driver</Text>
        </TouchableOpacity>
      </View>

      {form && (
        <View style={styles.card}>
          <Text style={styles.title}>{form.id ? "Edit driver" : "New driver"}</Text>
          <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.muted} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
          <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={colors.muted} value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} />
          <TextInput style={styles.input} placeholder="License number" placeholderTextColor={colors.muted} value={form.licenseNumber} onChangeText={(t) => setForm({ ...form, licenseNumber: t })} />
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

      {drivers.map((d) => (
        <View key={d.id} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{d.name}</Text>
            <Text style={styles.itemMeta}>
              {d.phone} · {d.licenseNumber}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setForm({ id: d.id, name: d.name, phone: d.phone, licenseNumber: d.licenseNumber })}>
            <Ionicons name="pencil" size={16} color={colors.muted} style={{ marginRight: 12 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteDriver(d.id).then(refresh)}>
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
