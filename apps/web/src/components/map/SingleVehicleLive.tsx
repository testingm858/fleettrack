import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Polyline, TileLayer } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import {
  ArrowLeft,
  Battery,
  Compass,
  Layers,
  Lock,
  LocateFixed,
  Navigation,
  Phone,
  Route,
  Satellite as SatelliteIcon,
  Share2,
  Signal,
  TrendingUp,
  Unlock,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { DriverContact, TelemetryPing } from "@fleettrack/shared-types";
import { useFleet } from "@/hooks/useFleet";
import { getDriverContact, getVehiclePings, setImmobilizer } from "@/lib/api";
import { batteryColorClass, formatRelativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SpeedGauge } from "@/components/SpeedGauge";
import { Sparkline } from "@/components/Sparkline";
import { VehicleMarker } from "./VehicleMarker";
import { VehicleSubTabs, type SubTab } from "./VehicleSubTabs";

const TILE_LAYERS = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
};

function FabButton({ icon: Icon, active, onClick, title }: { icon: React.ComponentType<{ className?: string }>; active?: boolean; onClick: () => void; title: string }) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="icon"
      onClick={onClick}
      title={title}
      className="bg-surface shadow-md"
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

export function SingleVehicleLive({ vehicleId }: { vehicleId: string }) {
  const navigate = useNavigate();
  const { fleet } = useFleet();
  const vehicle = fleet.find((v) => v.id === vehicleId);

  const [subTab, setSubTab] = useState<SubTab>("live");
  const [layer, setLayer] = useState<"street" | "satellite">("street");
  const [showBreadcrumb, setShowBreadcrumb] = useState(false);
  const [showSpeedGraph, setShowSpeedGraph] = useState(false);
  const [pings, setPings] = useState<TelemetryPing[]>([]);
  const [driverContact, setDriverContact] = useState<DriverContact | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isTogglingImmobilizer, setIsTogglingImmobilizer] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    getDriverContact(vehicleId).then(setDriverContact).catch(() => setDriverContact(null));
    getVehiclePings(vehicleId, 50).then(setPings).catch(() => setPings([]));
  }, [vehicleId]);

  if (!vehicle) {
    return <p className="flex-1 p-6 text-center text-sm text-muted">Loading vehicle…</p>;
  }

  const status = vehicle.status;
  const location = status?.lastKnownLocation ?? { lat: 25.2048, lng: 55.2708 };

  function recenter() {
    mapRef.current?.setView([location.lat, location.lng], mapRef.current.getZoom());
  }

  function resetView() {
    mapRef.current?.setView([location.lat, location.lng], 14);
  }

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 14);
    });
  }

  async function handleShare() {
    const url = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — nothing
      // useful to do beyond not crashing the click handler.
    }
  }

  async function confirmImmobilizerToggle() {
    setIsTogglingImmobilizer(true);
    try {
      await setImmobilizer(vehicleId, !status?.immobilizer);
      setConfirmOpen(false);
    } finally {
      setIsTogglingImmobilizer(false);
    }
  }

  const breadcrumbPositions = pings
    .slice()
    .reverse()
    .map((p) => [p.lat, p.lng] as [number, number]);
  const speedHistory = pings.slice().reverse().map((p) => p.speed);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-3">
        <button onClick={() => navigate("/map")} className="text-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold text-foreground">{vehicle.name}</h1>
      </div>

      <VehicleSubTabs active={subTab} onChange={setSubTab} />

      {subTab !== "live" ? (
        <p className="flex-1 p-8 text-center text-sm text-muted">
          {subTab.charAt(0).toUpperCase() + subTab.slice(1)} lands in a later build step.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between bg-surface px-3 py-2">
            <div>
              <p className="text-xs font-medium text-foreground">Live Tracking</p>
              <p className="text-[11px] text-muted">Updated {formatRelativeTime(status?.lastPing ?? null)}</p>
            </div>
            <StatusBadge status={status?.currentStatus ?? "offline"} />
          </div>

          <div className="relative flex-1">
            <MapContainer
              key={vehicleId}
              ref={mapRef}
              center={[location.lat, location.lng]}
              zoom={14}
              className="h-full w-full"
            >
              <TileLayer attribution={TILE_LAYERS[layer].attribution} url={TILE_LAYERS[layer].url} />
              {showBreadcrumb && breadcrumbPositions.length > 1 && (
                <Polyline positions={breadcrumbPositions} pathOptions={{ color: "#3b82f6", weight: 3 }} />
              )}
              <VehicleMarker
                lat={location.lat}
                lng={location.lng}
                heading={status?.heading ?? 0}
                status={status?.currentStatus ?? "offline"}
                label={vehicle.name}
              />
            </MapContainer>

            <div className="absolute right-3 top-3 flex flex-col gap-2">
              <FabButton icon={Share2} onClick={handleShare} title="Share location" />
              <FabButton icon={LocateFixed} onClick={recenter} title="Center on vehicle" />
              <FabButton icon={Layers} active={layer === "satellite"} onClick={() => setLayer((l) => (l === "street" ? "satellite" : "street"))} title="Toggle satellite layer" />
              <FabButton icon={Compass} onClick={resetView} title="Reset view" />
              <FabButton icon={TrendingUp} active={showSpeedGraph} onClick={() => setShowSpeedGraph((v) => !v)} title="Toggle speed graph" />
              <FabButton icon={Route} active={showBreadcrumb} onClick={() => setShowBreadcrumb((v) => !v)} title="Toggle route breadcrumb" />
              <FabButton icon={Navigation} onClick={useMyLocation} title="My location" />
              <FabButton icon={ZoomIn} onClick={() => mapRef.current?.zoomIn()} title="Zoom in" />
              <FabButton icon={ZoomOut} onClick={() => mapRef.current?.zoomOut()} title="Zoom out" />
            </div>

            {shareCopied && (
              <div className="absolute right-16 top-3 rounded-md bg-surface px-2 py-1 text-xs text-foreground shadow-md">
                Link copied
              </div>
            )}

            <div className="absolute bottom-3 left-3 rounded-xl bg-surface/90 p-2 shadow-md">
              <SpeedGauge speed={status?.speed ?? 0} />
            </div>

            {showSpeedGraph && (
              <div className="absolute bottom-3 right-3 rounded-lg bg-surface/90 p-2 shadow-md">
                <p className="mb-1 text-[10px] text-muted">Recent speed</p>
                <Sparkline values={speedHistory} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-border bg-surface px-3 py-2 text-xs sm:grid-cols-6">
            <div className="flex items-center gap-1">
              <Battery className={`h-4 w-4 ${batteryColorClass(status?.batteryPct ?? 0)}`} />
              <span className={batteryColorClass(status?.batteryPct ?? 0)}>{status?.batteryPct ?? 0}%</span>
            </div>
            <div className="flex items-center gap-1 text-muted">
              <Signal className="h-4 w-4" />
              {status?.rssiPct ?? 0}%
            </div>
            <div className="flex items-center gap-1 text-muted">
              <SatelliteIcon className="h-4 w-4" />
              {status?.satelliteCount ?? 0}
            </div>
            <div className="flex items-center gap-1 text-muted">
              {status?.immobilizer ? <Lock className="h-4 w-4 text-status-idle" /> : <Unlock className="h-4 w-4" />}
              {status?.immobilizer ? "Immobilized" : "Free"}
            </div>
            <div className="col-span-2 flex items-center gap-1 text-muted">
              <span className="truncate">{Math.round(status?.odometerKm ?? 0)} km</span>
            </div>
            <p className="col-span-3 truncate text-muted sm:col-span-6">{status?.address ?? "Address unavailable"}</p>
          </div>

          <div className="flex gap-2 border-t border-border bg-surface p-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!driverContact}
              onClick={() => driverContact && (window.location.href = `tel:${driverContact.phone}`)}
            >
              <Phone className="h-4 w-4" /> {driverContact ? `Call ${driverContact.name}` : "No driver assigned"}
            </Button>
            <Button variant={status?.immobilizer ? "default" : "destructive"} className="flex-1" onClick={() => setConfirmOpen(true)}>
              {status?.immobilizer ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {status?.immobilizer ? "Release engine" : "Cut engine"}
            </Button>
          </div>
        </>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-foreground">
              {status?.immobilizer ? "Release the engine immobilizer?" : "Cut the engine remotely?"}
            </h2>
            <p className="mt-2 text-xs text-muted">
              {status?.immobilizer
                ? `${vehicle.name} will be able to start again immediately.`
                : `${vehicle.name} will be immobilized immediately, even if currently moving. This action is logged.`}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={isTogglingImmobilizer}
                onClick={confirmImmobilizerToggle}
              >
                {isTogglingImmobilizer ? "Sending…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
