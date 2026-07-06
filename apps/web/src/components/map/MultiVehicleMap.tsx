import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { Geofence } from "@fleettrack/shared-types";
import { useFleet } from "@/hooks/useFleet";
import { getGeofences } from "@/lib/api";
import { VehicleMarker } from "./VehicleMarker";
import { GeofenceLayer } from "./GeofenceLayer";

const DUBAI_CENTER: [number, number] = [25.2048, 55.2708];

export function MultiVehicleMap() {
  const { fleet } = useFleet();
  const navigate = useNavigate();
  const [geofences, setGeofences] = useState<Geofence[]>([]);

  useEffect(() => {
    getGeofences()
      .then(setGeofences)
      .catch(() => setGeofences([]));
  }, []);

  const located = fleet.filter((v) => v.status?.lastKnownLocation);

  return (
    <div className="flex-1">
      <MapContainer center={DUBAI_CENTER} zoom={11} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeofenceLayer geofences={geofences} />
        <MarkerClusterGroup chunkedLoading>
          {located.map((vehicle) => (
            <VehicleMarker
              key={vehicle.id}
              lat={vehicle.status!.lastKnownLocation!.lat}
              lng={vehicle.status!.lastKnownLocation!.lng}
              heading={vehicle.status!.heading}
              status={vehicle.status!.currentStatus}
              label={vehicle.name}
              onClick={() => navigate(`/map?vehicleId=${vehicle.id}`)}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
