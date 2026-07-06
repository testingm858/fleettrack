import { useCallback, useEffect, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { Alert as FleetAlert, AlertType } from "@fleettrack/shared-types";
import { useFleet } from "../hooks/useFleet";
import { getAlerts } from "../lib/api";
import { getSocket } from "../lib/socket";
import { ALERT_TYPE_CONFIG } from "../lib/alertTypes";
import { formatRelativeTime } from "../lib/format";
import { LeafletMapView } from "../components/LeafletMapView";
import { colors } from "../theme/colors";

interface FilterState {
  type: AlertType | "all";
  vehicleId: string | "all";
}

const EMPTY_FILTERS: FilterState = { type: "all", vehicleId: "all" };

export function AlertsScreen() {
  const { fleet } = useFleet();
  const navigation = useNavigation<any>();
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selected, setSelected] = useState<FleetAlert | null>(null);

  const vehicleName = useCallback(
    (id: string) => fleet.find((v) => v.id === id)?.name ?? "Unknown vehicle",
    [fleet],
  );

  const loadFirstPage = useCallback(() => {
    setIsLoading(true);
    getAlerts({
      type: filters.type === "all" ? undefined : filters.type,
      vehicleId: filters.vehicleId === "all" ? undefined : filters.vehicleId,
      search: search || undefined,
      limit: 20,
    })
      .then((res) => {
        setAlerts(res.alerts);
        setNextCursor(res.nextCursor);
      })
      .finally(() => setIsLoading(false));
  }, [filters, search]);

  useEffect(loadFirstPage, [loadFirstPage]);

  function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    getAlerts({
      type: filters.type === "all" ? undefined : filters.type,
      vehicleId: filters.vehicleId === "all" ? undefined : filters.vehicleId,
      search: search || undefined,
      cursor: nextCursor,
      limit: 20,
    })
      .then((res) => {
        setAlerts((prev) => [...prev, ...res.alerts]);
        setNextCursor(res.nextCursor);
      })
      .finally(() => setIsLoadingMore(false));
  }

  useEffect(() => {
    const socket = getSocket();
    const onNew = (alert: FleetAlert) => {
      const matchesType = filters.type === "all" || alert.type === filters.type;
      const matchesVehicle = filters.vehicleId === "all" || alert.vehicleId === filters.vehicleId;
      if (matchesType && matchesVehicle) setAlerts((prev) => [alert, ...prev]);
    };
    socket.on("alert:new", onNew);
    return () => {
      socket.off("alert:new", onNew);
    };
  }, [filters]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TextInput
          style={styles.search}
          placeholder="Search by address…"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalOpen(true)}>
          <Ionicons name="filter" size={16} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {isLoading && <Text style={styles.message}>Loading alerts…</Text>}
      {!isLoading && alerts.length === 0 && <Text style={styles.message}>No alerts match your filters.</Text>}

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={isLoadingMore ? <Text style={styles.message}>Loading more…</Text> : null}
        renderItem={({ item }) => {
          const { label, icon, color } = ALERT_TYPE_CONFIG[item.type];
          return (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
              <Ionicons name={icon} size={20} color={color} style={{ marginTop: 2 }} />
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle}>{label}</Text>
                  <Text style={styles.cardTime}>{formatRelativeTime(item.timestamp)}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("Map", { vehicleId: item.vehicleId })}>
                  <Text style={styles.cardVehicle}>{vehicleName(item.vehicleId)}</Text>
                </TouchableOpacity>
                <Text style={styles.cardAddress} numberOfLines={1}>
                  {item.address ?? `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={filterModalOpen} animationType="slide" transparent onRequestClose={() => setFilterModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Notification Filters</Text>
              <TouchableOpacity onPress={() => setFilterModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.filterLabel}>Alert type</Text>
            <View style={styles.chipWrap}>
              {(["all", ...Object.keys(ALERT_TYPE_CONFIG)] as (AlertType | "all")[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, filters.type === type && styles.chipActive]}
                  onPress={() => setFilters({ ...filters, type })}
                >
                  <Text style={[styles.chipText, filters.type === type && styles.chipTextActive]}>
                    {type === "all" ? "All types" : ALERT_TYPE_CONFIG[type].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.filterLabel}>Vehicle</Text>
            <View style={styles.chipWrap}>
              <TouchableOpacity
                style={[styles.chip, filters.vehicleId === "all" && styles.chipActive]}
                onPress={() => setFilters({ ...filters, vehicleId: "all" })}
              >
                <Text style={[styles.chipText, filters.vehicleId === "all" && styles.chipTextActive]}>All vehicles</Text>
              </TouchableOpacity>
              {fleet.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.chip, filters.vehicleId === v.id && styles.chipActive]}
                  onPress={() => setFilters({ ...filters, vehicleId: v.id })}
                >
                  <Text style={[styles.chipText, filters.vehicleId === v.id && styles.chipTextActive]}>{v.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.resetButton} onPress={() => setFilters(EMPTY_FORM_STATE())}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selected} animationType="fade" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            {selected && (
              <>
                <View style={{ height: 180, borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
                  <LeafletMapView center={{ lat: selected.lat, lng: selected.lng }} zoom={15} markers={[{ id: "a", lat: selected.lat, lng: selected.lng, color: ALERT_TYPE_CONFIG[selected.type].color }]} />
                </View>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>{ALERT_TYPE_CONFIG[selected.type].label}</Text>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <Ionicons name="close" size={20} color={colors.muted} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.detailLine}>Vehicle: {vehicleName(selected.vehicleId)}</Text>
                <Text style={styles.detailLine}>Time: {new Date(selected.timestamp).toLocaleString()}</Text>
                <Text style={styles.detailLine}>
                  Coordinates: {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
                </Text>
                {selected.address && <Text style={styles.detailAddress}>{selected.address}</Text>}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EMPTY_FORM_STATE(): FilterState {
  return { ...EMPTY_FILTERS };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 12 },
  headerRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  search: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    color: colors.foreground,
  },
  filterButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  message: { color: colors.muted, textAlign: "center", marginTop: 16 },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  cardBody: { flex: 1, gap: 2 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between" },
  cardTitle: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
  cardTime: { color: colors.muted, fontSize: 10 },
  cardVehicle: { color: colors.primary, fontSize: 11 },
  cardAddress: { color: colors.muted, fontSize: 11 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: "85%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sheetTitle: { color: colors.foreground, fontSize: 15, fontWeight: "700" },
  filterLabel: { color: colors.muted, fontSize: 11, marginTop: 8, marginBottom: 6 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}26` },
  chipText: { color: colors.muted, fontSize: 11 },
  chipTextActive: { color: colors.primary },
  resetButton: { marginTop: 16, alignSelf: "center", paddingVertical: 8, paddingHorizontal: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 10 },
  resetText: { color: colors.foreground, fontSize: 12, fontWeight: "600" },
  detailLine: { color: colors.muted, fontSize: 12, marginTop: 2 },
  detailAddress: { color: colors.foreground, fontSize: 12, marginTop: 6 },
});
