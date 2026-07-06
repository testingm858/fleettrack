import { Car, Bike, Truck, Battery, Signal, Satellite, Power, Lock, Zap } from "lucide-react";
import type { FleetVehicle } from "@/hooks/useFleet";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { batteryColorClass, formatRelativeTime } from "@/lib/format";

const VEHICLE_ICONS = { car: Car, bike: Bike, truck: Truck } as const;

function StatChip({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className={cn("h-3.5 w-3.5 text-muted", colorClass)} />
      <span className={cn("text-muted", colorClass)}>{label}:</span>
      <span className={cn("font-medium text-foreground", colorClass)}>{value}</span>
    </div>
  );
}

export function VehicleCard({ vehicle, onClick }: { vehicle: FleetVehicle; onClick?: () => void }) {
  const Icon = VEHICLE_ICONS[vehicle.type];
  const status = vehicle.status;

  return (
    <Card
      onClick={onClick}
      className={cn("flex flex-col gap-3 p-4", onClick && "cursor-pointer transition-colors hover:bg-surface-hover")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted" />
          <div>
            <p className="text-sm font-semibold text-foreground">{vehicle.name}</p>
            <p className="text-xs text-muted">{vehicle.plateNumber}</p>
          </div>
        </div>
        <StatusBadge status={status?.currentStatus ?? "offline"} />
      </div>

      {status?.address && <p className="truncate text-xs text-muted">{status.address}</p>}

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3 sm:grid-cols-3">
        <StatChip icon={Zap} label="Speed" value={`${status?.speed ?? 0} km/h`} />
        <StatChip
          icon={Battery}
          label="Battery"
          value={`${status?.batteryPct ?? 0}%`}
          colorClass={batteryColorClass(status?.batteryPct ?? 0)}
        />
        <StatChip icon={Signal} label="Signal" value={`${status?.rssiPct ?? 0}%`} />
        <StatChip icon={Satellite} label="Sats" value={`${status?.satelliteCount ?? 0}`} />
        <StatChip
          icon={Power}
          label="Ignition"
          value={status?.ignition ? "On" : "Off"}
          colorClass={status?.ignition ? "text-status-running" : "text-status-stopped"}
        />
        <StatChip
          icon={Lock}
          label="Immobilizer"
          value={status?.immobilizer ? "On" : "Off"}
          colorClass={status?.immobilizer ? "text-status-idle" : undefined}
        />
      </div>

      <p className="text-right text-[11px] text-muted">Updated {formatRelativeTime(status?.lastPing ?? null)}</p>
    </Card>
  );
}
