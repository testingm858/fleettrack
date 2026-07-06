import { useState } from "react";
import { Filter, X } from "lucide-react";
import type { AlertType, Vehicle } from "@fleettrack/shared-types";
import { ALERT_TYPE_CONFIG } from "@/lib/alertTypes";
import { Button } from "@/components/ui/button";

export interface AlertFilterState {
  type: AlertType | "all";
  vehicleId: string | "all";
  from: string;
  to: string;
}

export const EMPTY_FILTERS: AlertFilterState = { type: "all", vehicleId: "all", from: "", to: "" };

export function AlertFilters({
  vehicles,
  filters,
  onChange,
}: {
  vehicles: Vehicle[];
  filters: AlertFilterState;
  onChange: (filters: AlertFilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = Object.entries(filters).filter(([key, value]) => value !== EMPTY_FILTERS[key as keyof AlertFilterState]).length;

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <Filter className="h-4 w-4" />
        Notification Filters
        {activeCount > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{activeCount}</span>}
      </Button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-border bg-surface p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Filters</p>
            <button onClick={() => setOpen(false)} className="text-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mt-3 block text-[11px] text-muted">Alert type</label>
          <select
            value={filters.type}
            onChange={(e) => onChange({ ...filters, type: e.target.value as AlertFilterState["type"] })}
            className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground"
          >
            <option value="all">All types</option>
            {(Object.keys(ALERT_TYPE_CONFIG) as AlertType[]).map((type) => (
              <option key={type} value={type}>
                {ALERT_TYPE_CONFIG[type].label}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-[11px] text-muted">Vehicle</label>
          <select
            value={filters.vehicleId}
            onChange={(e) => onChange({ ...filters, vehicleId: e.target.value })}
            className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground"
          >
            <option value="all">All vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-[11px] text-muted">Date range</label>
          <div className="mt-1 flex gap-2">
            <input
              type="date"
              value={filters.from}
              onChange={(e) => onChange({ ...filters, from: e.target.value })}
              className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
            />
            <input
              type="date"
              value={filters.to}
              onChange={(e) => onChange({ ...filters, to: e.target.value })}
              className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
            />
          </div>

          <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => onChange(EMPTY_FILTERS)}>
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}
