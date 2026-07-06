import type { Alert } from "@fleettrack/shared-types";
import { ALERT_TYPE_CONFIG } from "@/lib/alertTypes";
import { formatRelativeTime } from "@/lib/format";
import { Card } from "@/components/ui/card";

export function AlertCard({
  alert,
  vehicleName,
  onVehicleClick,
  onClick,
}: {
  alert: Alert;
  vehicleName: string;
  onVehicleClick: () => void;
  onClick: () => void;
}) {
  const { label, icon: Icon, color } = ALERT_TYPE_CONFIG[alert.type];

  return (
    <Card onClick={onClick} className="flex cursor-pointer gap-3 p-3 transition-colors hover:bg-surface-hover">
      <Icon className={`h-5 w-5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <span className="shrink-0 text-[11px] text-muted">{formatRelativeTime(alert.timestamp)}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onVehicleClick();
          }}
          className="text-xs text-primary hover:underline"
        >
          {vehicleName}
        </button>
        <p className="truncate text-xs text-muted">{alert.address ?? `${alert.lat.toFixed(4)}, ${alert.lng.toFixed(4)}`}</p>
      </div>
    </Card>
  );
}
