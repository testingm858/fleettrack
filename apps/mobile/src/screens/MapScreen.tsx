import { useEffect, useState } from "react";
import { Alert, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import type { DriverContact } from "@fleettrack/shared-types";
import { useFleet } from "../hooks/useFleet";
import { getDriverContact, setImmobilizer } from "../lib/api";
import { LeafletMapView } from "../components/LeafletMapView";
import { colors } from "../theme/colors";
import { batteryColor, formatRelativeTime } from "../lib/format";

const DUBAI_CENTER = { lat: 25.2048, lng: 55.2708 };

const STATUS_COLORS: Record<string, string> = {
  running: colors.statusRunning,
  stopped: colors.statusStopped,
  idle: colors.statusIdle,
  offline: colors.statusOffline,
};

export function MapScreen() {
  const { fleet } = useFleet();
  const route = useRoute<any>();
  const [selectedId, setSelectedId] = useState<string | null>(route.params?.vehicleId ?? null);
  const [driverContact, setDriverContact] = useState<DriverContact | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // The Status/Alerts tabs deep-link here with a vehicleId param — re-open
  // the detail sheet whenever a new one arrives.
  useEffect(() => {
    if (route.params?.vehicleId) setSelectedId(route.params.vehicleId);
  }, [route.params?.vehicleId]);

  const selected = fleet.find((v) => v.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId) {
      getDriverContact(selectedId).then(setDriverContact).catch(() => setDriverContact(null));
    }
  }, [selectedId]);

  const markers = fleet
    .filter((v) => v.status?.lastKnownLocation)
    .map((v) => ({
      id: v.id,
      lat: v.status!.lastKnownLocation!.lat,
      lng: v.status!.lastKnownLocation!.lng,
      heading: v.status!.heading,
      color: STATUS_COLORS[v.status!.currentStatus],
      label: v.name,
    }));

  function confirmImmobilizer() {
    if (!selected?.status) return;
    const nextEnable = !selected.status.immobilizer;
    Alert.alert(
      nextEnable ? "Cut the engine remotely?" : "Release the engine immobilizer?",
      nextEnable
        ? `${selected.name} will be immobilized immediately, even if currently moving. This action is logged.`
        : `${selected.name} will be able to start again immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            setIsToggling(true);
            try {
              await setImmobilizer(selected.id, nextEnable);
            } finally {
              setIsToggling(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <LeafletMapView center={DUBAI_CENTER} zoom={11} markers={markers} onMarkerPress={setSelectedId} />

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelectedId(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            {selected?.status && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.vehicleName}>{selected.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedId(null)}>
                    <Ionicons name="close" size={22} color={colors.muted} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.address}>{selected.status.address ?? "Address unavailable"}</Text>
                <Text style={styles.updated}>Updated {formatRelativeTime(selected.status.lastPing)}</Text>

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Ionicons name="speedometer" size={16} color={colors.muted} />
                    <Text style={styles.statText}>{selected.status.speed} km/h</Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="battery-half" size={16} color={batteryColor(selected.status.batteryPct, colors)} />
                    <Text style={[styles.statText, { color: batteryColor(selected.status.batteryPct, colors) }]}>
                      {selected.status.batteryPct}%
                    </Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name={selected.status.immobilizer ? "lock-closed" : "lock-open"} size={16} color={colors.muted} />
                    <Text style={styles.statText}>{selected.status.immobilizer ? "Immobilized" : "Free"}</Text>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, !driverContact && styles.actionButtonDisabled]}
                    disabled={!driverContact}
                    onPress={() => driverContact && Linking.openURL(`tel:${driverContact.phone}`)}
                  >
                    <Ionicons name="call" size={16} color={colors.foreground} />
                    <Text style={styles.actionText}>{driverContact ? `Call ${driverContact.name}` : "No driver"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={confirmImmobilizer} disabled={isToggling}>
                    <Ionicons name={selected.status.immobilizer ? "lock-open" : "lock-closed"} size={16} color={colors.foreground} />
                    <Text style={styles.actionText}>{selected.status.immobilizer ? "Release engine" : "Cut engine"}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 8 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vehicleName: { color: colors.foreground, fontSize: 16, fontWeight: "700" },
  address: { color: colors.muted, fontSize: 12 },
  updated: { color: colors.muted, fontSize: 11 },
  statsRow: { flexDirection: "row", gap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 6 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionText: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
});
