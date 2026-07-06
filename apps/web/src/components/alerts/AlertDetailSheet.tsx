import { MapContainer, Marker, TileLayer } from "react-leaflet";
import type { Alert } from "@fleettrack/shared-types";
import { ALERT_TYPE_CONFIG } from "@/lib/alertTypes";
import { Button } from "@/components/ui/button";

export function AlertDetailSheet({
  alert,
  vehicleName,
  onClose,
  onViewOnMap,
}: {
  alert: Alert;
  vehicleName: string;
  onClose: () => void;
  onViewOnMap: () => void;
}) {
  const { label, icon: Icon, color } = ALERT_TYPE_CONFIG[alert.type];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl border border-border bg-surface sm:rounded-2xl">
        <div className="h-40 overflow-hidden rounded-t-2xl">
          <MapContainer center={[alert.lat, alert.lng]} zoom={15} className="h-full w-full" dragging={false} zoomControl={false} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={[alert.lat, alert.lng]} />
          </MapContainer>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${color}`} />
            <h2 className="text-sm font-semibold text-foreground">{label}</h2>
          </div>
          <p className="mt-2 text-xs text-muted">Vehicle: <span className="text-foreground">{vehicleName}</span></p>
          <p className="text-xs text-muted">Time: <span className="text-foreground">{new Date(alert.timestamp).toLocaleString()}</span></p>
          <p className="text-xs text-muted">
            Coordinates: <span className="text-foreground">{alert.lat.toFixed(5)}, {alert.lng.toFixed(5)}</span>
          </p>
          {alert.address && <p className="mt-1 text-xs text-muted">{alert.address}</p>}

          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
            <Button className="flex-1" onClick={onViewOnMap}>
              View on map
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
