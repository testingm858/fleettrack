import type { VehicleStatusValue } from "@fleettrack/shared-types";
import { Circle, Square, Pause, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Color alone never carries meaning here: each status also ships an icon and
// text label so colorblind users aren't relying on the color-coding.
const STATUS_CONFIG: Record<
  VehicleStatusValue,
  { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  running: { label: "Running", color: "text-status-running", bg: "bg-status-running/15", icon: Circle },
  stopped: { label: "Stopped", color: "text-status-stopped", bg: "bg-status-stopped/15", icon: Square },
  idle: { label: "Idle", color: "text-status-idle", bg: "bg-status-idle/15", icon: Pause },
  offline: { label: "Offline", color: "text-status-offline", bg: "bg-status-offline/15", icon: WifiOff },
};

export function StatusBadge({ status }: { status: VehicleStatusValue }) {
  const { label, color, bg, icon: Icon } = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        color,
        bg,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
