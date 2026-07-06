import { useEffect, useMemo, useState } from "react";
import type { Vehicle, VehicleStatus } from "@fleettrack/shared-types";
import { getVehicles, getVehicleStatuses } from "../lib/api";
import { getSocket } from "../lib/socket";

export interface FleetVehicle extends Vehicle {
  status: VehicleStatus | null;
}

export function useFleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [statuses, setStatuses] = useState<Record<string, VehicleStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getVehicles(), getVehicleStatuses()])
      .then(([vehicleList, statusList]) => {
        if (cancelled) return;
        setVehicles(vehicleList);
        setStatuses(Object.fromEntries(statusList.map((s) => [s.vehicleId, s])));
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load fleet"))
      .finally(() => !cancelled && setIsLoading(false));

    const socket = getSocket();
    const onStatus = (status: VehicleStatus) => {
      setStatuses((prev) => ({ ...prev, [status.vehicleId]: status }));
    };
    socket.on("vehicle:status", onStatus);

    return () => {
      cancelled = true;
      socket.off("vehicle:status", onStatus);
    };
  }, []);

  const fleet: FleetVehicle[] = useMemo(
    () => vehicles.map((vehicle) => ({ ...vehicle, status: statuses[vehicle.id] ?? null })),
    [vehicles, statuses],
  );

  return { fleet, isLoading, error };
}
