import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileDown, FileText } from "lucide-react";
import type { Alert } from "@fleettrack/shared-types";
import { useFleet } from "@/hooks/useFleet";
import { downloadAlertsExport, getAlerts } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Input } from "@/components/ui/input";
import { AlertCard } from "@/components/alerts/AlertCard";
import { AlertDetailSheet } from "@/components/alerts/AlertDetailSheet";
import { AlertFilters, EMPTY_FILTERS, type AlertFilterState } from "@/components/alerts/AlertFilters";

function matchesFilters(alert: Alert, filters: AlertFilterState, search: string): boolean {
  if (filters.type !== "all" && alert.type !== filters.type) return false;
  if (filters.vehicleId !== "all" && alert.vehicleId !== filters.vehicleId) return false;
  if (filters.from && new Date(alert.timestamp) < new Date(filters.from)) return false;
  if (filters.to && new Date(alert.timestamp) > new Date(filters.to)) return false;
  const term = search.trim().toLowerCase();
  if (term && !(alert.address ?? "").toLowerCase().includes(term)) return false;
  return true;
}

export function AlertsPage() {
  const { fleet } = useFleet();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AlertFilterState>(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Alert | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const vehicleName = useCallback(
    (vehicleId: string) => fleet.find((v) => v.id === vehicleId)?.name ?? "Unknown vehicle",
    [fleet],
  );

  const loadFirstPage = useCallback(() => {
    setIsLoading(true);
    getAlerts({
      type: filters.type === "all" ? undefined : filters.type,
      vehicleId: filters.vehicleId === "all" ? undefined : filters.vehicleId,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to).toISOString() : undefined,
      search: search || undefined,
      limit: 20,
    })
      .then((res) => {
        setAlerts(res.alerts);
        setNextCursor(res.nextCursor);
      })
      .finally(() => setIsLoading(false));
  }, [filters, search]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    getAlerts({
      type: filters.type === "all" ? undefined : filters.type,
      vehicleId: filters.vehicleId === "all" ? undefined : filters.vehicleId,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to).toISOString() : undefined,
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

  // Infinite scroll: fetch the next page once the sentinel div at the bottom
  // of the feed enters the viewport, instead of a numbered pager — a fleet's
  // alert history can run into the thousands.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor, isLoadingMore, filters, search]);

  useEffect(() => {
    const socket = getSocket();
    const onNew = (alert: Alert) => {
      if (matchesFilters(alert, filters, search)) {
        setAlerts((prev) => [alert, ...prev]);
      }
    };
    socket.on("alert:new", onNew);
    return () => {
      socket.off("alert:new", onNew);
    };
  }, [filters, search]);

  function handleExport(format: "csv" | "pdf") {
    downloadAlertsExport(format, {
      type: filters.type === "all" ? undefined : filters.type,
      vehicleId: filters.vehicleId === "all" ? undefined : filters.vehicleId,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to).toISOString() : undefined,
      search: search || undefined,
    }).catch(() => undefined);
  }

  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex gap-2">
        <Input placeholder="Search by address…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <AlertFilters vehicles={fleet} filters={filters} onChange={setFilters} />
        <button
          onClick={() => handleExport("csv")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
          title="Export CSV"
        >
          <FileDown className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleExport("pdf")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
          title="Export PDF"
        >
          <FileText className="h-4 w-4" />
        </button>
      </div>

      {isLoading && <p className="text-center text-sm text-muted">Loading alerts…</p>}
      {!isLoading && alerts.length === 0 && <p className="text-center text-sm text-muted">No alerts match your filters.</p>}

      <div className="flex flex-col gap-2">
        {alerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            vehicleName={vehicleName(alert.vehicleId)}
            onClick={() => setSelected(alert)}
            onVehicleClick={() => navigate(`/map?vehicleId=${alert.vehicleId}`)}
          />
        ))}
      </div>

      <div ref={sentinelRef} className="h-4" />
      {isLoadingMore && <p className="text-center text-xs text-muted">Loading more…</p>}

      {selected && (
        <AlertDetailSheet
          alert={selected}
          vehicleName={vehicleName(selected.vehicleId)}
          onClose={() => setSelected(null)}
          onViewOnMap={() => navigate(`/map?vehicleId=${selected.vehicleId}`)}
        />
      )}
    </div>
  );
}
