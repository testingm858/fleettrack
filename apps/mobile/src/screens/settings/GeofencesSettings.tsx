import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Geofence, GeofenceShape, LatLng, Vehicle } from "@fleettrack/shared-types";
import { createGeofence, deleteGeofence, getGeofences, getVehicles, updateGeofence } from "../../lib/api";
import { LeafletMapView } from "../../components/LeafletMapView";
import { colors } from "../../theme/colors";

const DUBAI_CENTER = { lat: 25.2048, lng: 55.2708 };

interface FormState {
  id: string | null;
  name: string;
  shape: GeofenceShape;
  points: LatLng[];
  radiusMeters: number;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  assignedVehicleIds: string[];
}

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  shape: "circle",
  points: [],
  radiusMeters: 500,
  alertOnEntry: true,
  alertOnExit: true,
  assignedVehicleIds: [],
};

export function GeofencesSettings() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getGeofences().then(setGeofences);
    getVehicles().then(setVehicles);
  }

  useEffect(refresh, []);

  function handleMapPress(point: LatLng) {
    if (!form) return;
    setForm(form.shape === "circle" ? { ...form, points: [point] } : { ...form, points: [...form.points, point] });
  }

  function toggleVehicle(id: string) {
    if (!form) return;
    const assigned = form.assignedVehicleIds.includes(id)
      ? form.assignedVehicleIds.filter((v) => v !== id)
      : [...form.assignedVehicleIds, id];
    setForm({ ...form, assignedVehicleIds: assigned });
  }

  async function handleSave() {
    if (!form) return;
    setError(null);
    if (form.shape === "circle" && form.points.length !== 1) return setError("Tap the map once to place the center.");
    if (form.shape === "polygon" && form.points.length < 3) return setError("Tap at least 3 points to draw a polygon.");

    const payload = {
      name: form.name,
      shape: form.shape,
      coordinates: form.points,
      radiusMeters: form.shape === "circle" ? form.radiusMeters : null,
      alertOnEntry: form.alertOnEntry,
      alertOnExit: form.alertOnExit,
      assignedVehicleIds: form.assignedVehicleIds,
    };

    try {
      if (form.id) await updateGeofence(form.id, payload);
      else await createGeofence(payload);
      setForm(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save geofence");
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Geofences</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setForm(EMPTY_FORM)}>
          <Ionicons name="add" size={16} color={colors.foreground} />
          <Text style={styles.addButtonText}>Add geofence</Text>
        </TouchableOpacity>
      </View>

      {form && (
        <View style={styles.card}>
          <Text style={styles.title}>{form.id ? "Edit geofence" : "New geofence"}</Text>
          <Text style={styles.hint}>
            {form.shape === "circle" ? "Tap the map to set the center." : "Tap the map to add vertices (3+)."}
          </Text>
          <TextInput style={styles.input} placeholder="Name" placeholderTextColor={colors.muted} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />

          <View style={styles.row}>
            {(["circle", "polygon"] as const).map((shape) => (
              <TouchableOpacity key={shape} style={[styles.chip, form.shape === shape && styles.chipActive]} onPress={() => setForm({ ...form, shape, points: [] })}>
                <Text style={[styles.chipText, form.shape === shape && styles.chipTextActive]}>{shape}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.mapContainer}>
            <LeafletMapView
              center={DUBAI_CENTER}
              zoom={11}
              onMapPress={handleMapPress}
              circle={form.shape === "circle" && form.points[0] ? { center: form.points[0], radiusMeters: form.radiusMeters } : undefined}
              polygon={form.shape === "polygon" && form.points.length >= 3 ? form.points : undefined}
              markers={form.shape === "circle" && form.points[0] ? [{ id: "center", lat: form.points[0].lat, lng: form.points[0].lng }] : []}
            />
          </View>
          <Text style={styles.hint}>{form.points.length} point(s) placed</Text>

          {form.shape === "circle" && (
            <View>
              <Text style={styles.label}>Radius (meters)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(form.radiusMeters)}
                onChangeText={(t) => setForm({ ...form, radiusMeters: Number(t) || 0 })}
              />
            </View>
          )}

          <View style={styles.row}>
            <TouchableOpacity style={styles.toggleRow} onPress={() => setForm({ ...form, alertOnEntry: !form.alertOnEntry })}>
              <Ionicons name={form.alertOnEntry ? "checkbox" : "square-outline"} size={18} color={form.alertOnEntry ? colors.primary : colors.muted} />
              <Text style={styles.toggleText}>Alert on entry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toggleRow} onPress={() => setForm({ ...form, alertOnExit: !form.alertOnExit })}>
              <Ionicons name={form.alertOnExit ? "checkbox" : "square-outline"} size={18} color={form.alertOnExit ? colors.primary : colors.muted} />
              <Text style={styles.toggleText}>Alert on exit</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Assigned vehicles</Text>
          <View style={styles.row}>
            {vehicles.map((v) => (
              <TouchableOpacity key={v.id} style={[styles.chip, form.assignedVehicleIds.includes(v.id) && styles.chipActive]} onPress={() => toggleVehicle(v.id)}>
                <Text style={[styles.chipText, form.assignedVehicleIds.includes(v.id) && styles.chipTextActive]}>{v.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setForm(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {geofences.map((g) => (
        <View key={g.id} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{g.name}</Text>
            <Text style={styles.itemMeta}>
              {g.shape} · {g.assignedVehicleIds.length} vehicle(s)
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              setForm({
                id: g.id,
                name: g.name,
                shape: g.shape,
                points: g.coordinates,
                radiusMeters: g.radiusMeters ?? 500,
                alertOnEntry: g.alertOnEntry,
                alertOnExit: g.alertOnExit,
                assignedVehicleIds: g.assignedVehicleIds,
              })
            }
          >
            <Ionicons name="pencil" size={16} color={colors.muted} style={{ marginRight: 12 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteGeofence(g.id).then(refresh)}>
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
  hint: { color: colors.muted, fontSize: 11 },
  input: { height: 40, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 10, color: colors.foreground },
  row: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}26` },
  chipText: { color: colors.muted, fontSize: 11 },
  chipTextActive: { color: colors.primary },
  mapContainer: { height: 220, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  label: { color: colors.muted, fontSize: 11, marginTop: 4 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  toggleText: { color: colors.muted, fontSize: 11 },
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
