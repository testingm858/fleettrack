import { useSearchParams } from "react-router-dom";
import { MultiVehicleMap } from "@/components/map/MultiVehicleMap";
import { SingleVehicleLive } from "@/components/map/SingleVehicleLive";

export function MapPage() {
  const [searchParams] = useSearchParams();
  const vehicleId = searchParams.get("vehicleId");

  return vehicleId ? <SingleVehicleLive vehicleId={vehicleId} /> : <MultiVehicleMap />;
}
