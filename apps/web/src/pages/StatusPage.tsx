import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { VehicleStatusValue } from "@fleettrack/shared-types";
import { useFleet, type FleetVehicle } from "@/hooks/useFleet";
import { VehicleCard } from "@/components/VehicleCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FilterValue = "all" | VehicleStatusValue;
type SortField = "status" | "group" | "lastUpdate" | "battery";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "stopped", label: "Stopped" },
  { value: "idle", label: "Idle" },
  { value: "offline", label: "Offline" },
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

const VALID_FILTERS: FilterValue[] = ["all", "running", "stopped", "idle", "offline"];

export function StatusPage() {
  const { fleet, isLoading, error } = useFleet();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter");
  const [filter, setFilter] = useState<FilterValue>(
    VALID_FILTERS.includes(initialFilter as FilterValue) ? (initialFilter as FilterValue) : "all",
  );
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("lastUpdate");

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
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors",
              filter === value && "border-primary bg-primary/15 text-primary",
            )}
          >
            {label}
            <span className="rounded-full bg-surface-hover px-1.5 py-0.5 text-[10px]">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input placeholder="Search by name or plate…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as SortField)}
          className="h-10 shrink-0 rounded-lg border border-border bg-surface px-2 text-xs text-foreground"
        >
          <option value="lastUpdate">Sort: Last update</option>
          <option value="status">Sort: Status</option>
          <option value="group">Sort: Group</option>
          <option value="battery">Sort: Battery</option>
        </select>
      </div>

      {isLoading && <p className="text-center text-sm text-muted">Loading fleet…</p>}
      {error && <p className="text-center text-sm text-status-stopped">{error}</p>}

      {!isLoading && !error && visible.length === 0 && (
        <p className="text-center text-sm text-muted">No vehicles match your filters.</p>
      )}

      <div className="flex flex-col gap-3">
        {visible.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} onClick={() => navigate(`/map?vehicleId=${vehicle.id}`)} />
        ))}
      </div>
    </div>
  );
}
