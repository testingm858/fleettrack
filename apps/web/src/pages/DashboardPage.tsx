import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BatteryLow,
  Clock,
  FileDown,
  FileText,
  Gauge,
  KeyRound,
  LogIn,
  LogOut,
  Share2,
  ShieldAlert,
  Siren,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { AlertSummary, AlertType } from "@fleettrack/shared-types";
import { useFleet } from "@/hooks/useFleet";
import { downloadAlertsExport, getAlertSummary } from "@/lib/api";
import { DonutChart } from "@/components/DonutChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RangeValue = "today" | "7d" | "30d" | "custom";

const RANGES: { value: RangeValue; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "custom", label: "Custom" },
];

const ALERT_TILES: { label: string; icon: React.ComponentType<{ className?: string }>; types: AlertType[] }[] = [
  { label: "Zone In", icon: LogIn, types: ["zone_in"] },
  { label: "Zone Out", icon: LogOut, types: ["zone_out"] },
  { label: "Ignition Alert", icon: KeyRound, types: ["ignition_on", "ignition_off"] },
  { label: "Power Alert", icon: Zap, types: ["power_alert"] },
  { label: "Overspeed", icon: Gauge, types: ["overspeed"] },
  { label: "Harsh Braking", icon: TriangleAlert, types: ["harsh_braking"] },
  { label: "SOS / Panic", icon: Siren, types: ["sos"] },
  { label: "Low Battery", icon: BatteryLow, types: ["low_battery"] },
  { label: "Geofence Violation", icon: ShieldAlert, types: ["geofence_violation"] },
  { label: "Idle Time Exceeded", icon: Clock, types: ["idle_time_exceeded"] },
];

function rangeToDates(range: RangeValue, customFrom: string, customTo: string): { from?: string; to?: string } {
  const now = new Date();
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString() };
  }
  if (range === "7d") return { from: new Date(now.getTime() - 7 * 86400000).toISOString() };
  if (range === "30d") return { from: new Date(now.getTime() - 30 * 86400000).toISOString() };
  return {
    from: customFrom ? new Date(customFrom).toISOString() : undefined,
    to: customTo ? new Date(customTo).toISOString() : undefined,
  };
}

export function DashboardPage() {
  const { fleet } = useFleet();
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeValue>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [summary, setSummary] = useState<AlertSummary>({ total: 0, byType: {} });
  const [copied, setCopied] = useState(false);

  const counts = useMemo(() => {
    const result = { running: 0, stopped: 0, idle: 0, offline: 0 };
    for (const v of fleet) {
      const status = v.status?.currentStatus ?? "offline";
      result[status] += 1;
    }
    return result;
  }, [fleet]);

  useEffect(() => {
    const { from, to } = rangeToDates(range, customFrom, customTo);
    getAlertSummary({ from, to })
      .then(setSummary)
      .catch(() => setSummary({ total: 0, byType: {} }));
  }, [range, customFrom, customTo]);

  function tileCount(types: AlertType[]): number {
    return types.reduce((sum, t) => sum + (summary.byType[t] ?? 0), 0);
  }

  async function handleShare() {
    const text = `Fleet update: ${fleet.length} vehicles — ${counts.running} running, ${counts.idle} idle, ${counts.stopped} stopped, ${counts.offline} offline. ${summary.total} alerts in range.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable in some contexts — non-critical.
    }
  }

  async function handleExport(format: "csv" | "pdf") {
    const { from, to } = rangeToDates(range, customFrom, customTo);
    try {
      await downloadAlertsExport(format, { from, to });
    } catch {
      // Best-effort — nothing actionable to show the user beyond the failed download itself.
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {RANGES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setRange(value)}
            className={cn(
              "shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted",
              range === value && "border-primary bg-primary/15 text-primary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div className="flex gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-border bg-surface px-2 text-xs text-foreground"
          />
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-border bg-surface px-2 text-xs text-foreground"
          />
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-4 sm:flex-row sm:justify-around">
          <DonutChart
            centerLabel="Vehicles"
            segments={[
              { label: "Running", value: counts.running, color: "#22c55e" },
              { label: "Idle", value: counts.idle, color: "#f59e0b" },
              { label: "Stopped", value: counts.stopped, color: "#ef4444" },
              { label: "Offline", value: counts.offline, color: "#3b82f6" },
            ]}
          />
          <p className="max-w-xs text-center text-sm text-muted sm:text-left">
            Fleet update: <span className="text-foreground">{fleet.length} vehicles</span> — {counts.running} running,{" "}
            {counts.idle} idle, {counts.stopped} stopped, {counts.offline} offline.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            { label: "Running", value: counts.running, filter: "running" },
            { label: "Idle", value: counts.idle, filter: "idle" },
            { label: "Stopped", value: counts.stopped, filter: "stopped" },
            { label: "Offline", value: counts.offline, filter: "offline" },
          ] as const
        ).map((pill) => (
          <button
            key={pill.filter}
            onClick={() => navigate(`/status?filter=${pill.filter}`)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-hover"
          >
            <p className="text-lg font-semibold text-foreground">{pill.value}</p>
            <p className="text-[11px] text-muted">{pill.label}</p>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Alerts</CardTitle>
            <p className="text-xs text-muted">{summary.total} total in range</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleShare} className="text-muted hover:text-foreground" title="Copy summary">
              <Share2 className="h-4 w-4" />
            </button>
            <button onClick={() => handleExport("csv")} className="text-muted hover:text-foreground" title="Export CSV">
              <FileDown className="h-4 w-4" />
            </button>
            <button onClick={() => handleExport("pdf")} className="text-muted hover:text-foreground" title="Export PDF">
              <FileText className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {copied && <p className="mb-2 text-[11px] text-status-running">Summary copied to clipboard</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {ALERT_TILES.map(({ label, icon: Icon, types }) => (
              <div key={label} className="flex flex-col items-center gap-1 rounded-lg border border-border p-3 text-center">
                <Icon className="h-5 w-5 text-muted" />
                <span className="text-lg font-semibold text-foreground">{tileCount(types)}</span>
                <span className="text-[10px] text-muted">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
