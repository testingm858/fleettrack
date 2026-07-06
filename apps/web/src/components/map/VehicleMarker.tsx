import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import type { VehicleStatusValue } from "@fleettrack/shared-types";

const STATUS_COLORS: Record<VehicleStatusValue, string> = {
  running: "#22c55e",
  stopped: "#ef4444",
  idle: "#f59e0b",
  offline: "#3b82f6",
};

// A divIcon so the arrow can be CSS-rotated to the vehicle's heading —
// Leaflet's built-in markers can't be rotated without a plugin.
function buildIcon(status: VehicleStatusValue, heading: number) {
  const color = STATUS_COLORS[status];
  const html = `
    <div style="transform: rotate(${heading}deg); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2 L20 20 L12 16 L4 20 Z" fill="${color}" stroke="#0b0e14" stroke-width="1" />
      </svg>
    </div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function VehicleMarker({
  lat,
  lng,
  heading,
  status,
  label,
  onClick,
}: {
  lat: number;
  lng: number;
  heading: number;
  status: VehicleStatusValue;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Marker
      position={[lat, lng]}
      icon={buildIcon(status, heading)}
      eventHandlers={onClick ? { click: onClick } : undefined}
    >
      <Popup>{label}</Popup>
    </Marker>
  );
}
