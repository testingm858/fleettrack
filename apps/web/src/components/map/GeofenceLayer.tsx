import { Circle, Polygon, Tooltip } from "react-leaflet";
import type { Geofence } from "@fleettrack/shared-types";

export function GeofenceLayer({ geofences }: { geofences: Geofence[] }) {
  return (
    <>
      {geofences.map((geofence) => {
        const pathOptions = { color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.12, weight: 1.5 };

        if (geofence.shape === "circle" && geofence.coordinates[0] && geofence.radiusMeters) {
          const center = geofence.coordinates[0];
          return (
            <Circle
              key={geofence.id}
              center={[center.lat, center.lng]}
              radius={geofence.radiusMeters}
              pathOptions={pathOptions}
            >
              <Tooltip>{geofence.name}</Tooltip>
            </Circle>
          );
        }

        return (
          <Polygon
            key={geofence.id}
            positions={geofence.coordinates.map((c) => [c.lat, c.lng])}
            pathOptions={pathOptions}
          >
            <Tooltip>{geofence.name}</Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
