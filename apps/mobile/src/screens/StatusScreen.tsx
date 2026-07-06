import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { VehicleStatusValue } from "@fleettrack/shared-types";
import { useFleet, type FleetVehicle } from "../hooks/useFleet";
import { VehicleCard } from "../components/VehicleCard";
import { colors } from "../theme/colors";

type FilterValue = "all" | VehicleStatusValue;
type SortField = "lastUpdate" | "status" | "group" | "battery";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "stopped", label: "Stopped" },
  { value: "idle", label: "Idle" },
  { value: "offline", label: "Offline" },
];

const SORTS: { value: SortField; label: string }[] = [
  { value: "lastUpdate", label: "Last update" },
  { value: "status", label: "Status" },
  { value: "group", label: "Group" },
  { value: "battery", label: "Battery" },
];

function sortFleet(fleet: FleetVehicle[], field: SortField): FleetVehicle[] {
  return [...fleet].sort((a, b) => {
    switch (field) {
      case "status":
        return (a.status?.currentStatus ?? "offline").localeCompare(b.status?.currentStatus ?? "offline");
      case "group":
        return (a.groupId ?? "").localeCompare(b.groupId ?? "");
      case "battery":
        return (b.status?.batteryPct ?? 0) - (a.status?.batteryPct ?? 0);
      case "lastUpdate":
      default:
        return (b.status?.lastPing ?? "").localeCompare(a.status?.lastPing ?? "");
    }
  });
}

export function StatusScreen() {
  const { fleet, isLoading, error } = useFleet();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [filter, setFilter] = useState<FilterValue>((route.params?.filter as FilterValue) ?? "all");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("lastUpdate");

  // Dashboard's quick-stat pills jump here with a filter param — re-apply it
  // whenever it changes so tapping a different pill actually updates the list.
  useEffect(() => {
    if (route.params?.filter) setFilter(route.params.filter as FilterValue);
  }, [route.params?.filter]);

  const counts = useMemo(() => {
    const result: Record<FilterValue, number> = { all: fleet.length, running: 0, stopped: 0, idle: 0, offline: 0 };
    for (const v of fleet) {
      const status = v.status?.currentStatus ?? "offline";
      result[status] += 1;
    }
    return result;
  }, [fleet]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = fleet.filter((v) => {
      const matchesFilter = filter === "all" || (v.status?.currentStatus ?? "offline") === filter;
      const matchesSearch =
        !term || v.name.toLowerCase().includes(term) || v.plateNumber.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
    return sortFleet(filtered, sortField);
  }, [fleet, filter, search, sortField]);

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {FILTERS.map(({ value, label }) => {
          const active = filter === value;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setFilter(value)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
              <View style={[styles.filterCount, active && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{counts[value]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {searchOpen ? (
        <View style={styles.searchExpandedRow}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            autoFocus
            style={styles.searchExpandedInput}
            placeholder="Search by name or plate…"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              setSearchOpen(false);
              setSearch("");
            }}
            hitSlop={8}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort</Text>
          {SORTS.map(({ value, label }) => {
            const active = sortField === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setSortField(value)}
                style={[styles.sortChip, active && styles.sortChipActive]}
              >
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => setSearchOpen(true)}
            style={styles.searchToggle}
            accessibilityLabel="Search vehicles"
          >
            <Ionicons name="search" size={15} color={colors.muted} />
          </TouchableOpacity>
        </View>
      )}

      {isLoading && <Text style={styles.message}>Loading fleet…</Text>}
      {error && <Text style={[styles.message, { color: colors.statusStopped }]}>{error}</Text>}
      {!isLoading && !error && visible.length === 0 && (
        <Text style={styles.message}>No vehicles match your filters.</Text>
      )}

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <VehicleCard vehicle={item} onPress={() => navigation.navigate("Map", { vehicleId: item.id })} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 12 },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 34,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  filterChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}26` },
  filterChipText: { color: colors.muted, fontSize: 12, fontWeight: "500" },
  filterChipTextActive: { color: colors.primary },
  filterCount: {
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceHover,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterCountActive: { backgroundColor: `${colors.primary}40` },
  filterCountText: { color: colors.foreground, fontSize: 10, fontWeight: "600" },
  filterCountTextActive: { color: colors.primary },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  sortLabel: { color: colors.muted, fontSize: 11, fontWeight: "600", marginRight: 2 },
  searchToggle: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  searchExpandedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  searchExpandedInput: {
    flex: 1,
    height: "100%",
    color: colors.foreground,
    fontSize: 14,
  },
  cancelText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  sortChip: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 30,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  sortChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}26` },
  sortChipText: { color: colors.muted, fontSize: 11, fontWeight: "500" },
  sortChipTextActive: { color: colors.primary },
  message: { color: colors.muted, textAlign: "center", marginTop: 16 },
  list: { padding: 16, gap: 12 },
});
