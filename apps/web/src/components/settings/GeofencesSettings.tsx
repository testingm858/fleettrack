import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Circle, Polygon, Marker, useMapEvents } from "react-leaflet";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Geofence, GeofenceShape, LatLng, Vehicle } from "@fleettrack/shared-types";
import { createGeofence, deleteGeofence, getGeofences, getVehicles, updateGeofence } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DUBAI_CENTER: [number, number] = [25.2048, 55.2708];

function ClickCapture({ onClick }: { onClick: (point: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

interface FormState {
  id: string | null;
  name: string;
  shape: GeofenceShape;
  points: LatLng[];
  radiusMeters: number;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  assignedVehicleIds: string[];
}

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  shape: "circle",
  points: [],
  radiusMeters: 500,
  alertOnEntry: true,
  alertOnExit: true,
  assignedVehicleIds: [],
};

export function GeofencesSettings() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getGeofences().then(setGeofences);
    getVehicles().then(setVehicles);
  }

  useEffect(refresh, []);

  function startEdit(geofence: Geofence) {
    setForm({
      id: geofence.id,
      name: geofence.name,
      shape: geofence.shape,
      points: geofence.coordinates,
      radiusMeters: geofence.radiusMeters ?? 500,
      alertOnEntry: geofence.alertOnEntry,
      alertOnExit: geofence.alertOnExit,
      assignedVehicleIds: geofence.assignedVehicleIds,
    });
  }

  function handleMapClick(point: LatLng) {
    if (!form) return;
    if (form.shape === "circle") {
      setForm({ ...form, points: [point] });
    } else {
      setForm({ ...form, points: [...form.points, point] });
    }
  }

  function undoLastPoint() {
    if (!form) return;
    setForm({ ...form, points: form.points.slice(0, -1) });
  }

  function toggleVehicle(id: string) {
    if (!form) return;
    const assigned = form.assignedVehicleIds.includes(id)
      ? form.assignedVehicleIds.filter((v) => v !== id)
      : [...form.assignedVehicleIds, id];
    setForm({ ...form, assignedVehicleIds: assigned });
  }

  async function handleSave() {
    if (!form) return;
    setError(null);

    if (form.shape === "circle" && form.points.length !== 1) {
      return setError("Click the map once to place the circle's center.");
    }
    if (form.shape === "polygon" && form.points.length < 3) {
      return setError("Click at least 3 points on the map to draw a polygon.");
    }

    const payload = {
      name: form.name,
      shape: form.shape,
      coordinates: form.points,
      radiusMeters: form.shape === "circle" ? form.radiusMeters : null,
      alertOnEntry: form.alertOnEntry,
      alertOnExit: form.alertOnExit,
      assignedVehicleIds: form.assignedVehicleIds,
    };

    try {
      if (form.id) {
        await updateGeofence(form.id, payload);
      } else {
        await createGeofence(payload);
      }
      setForm(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save geofence");
    }
  }

  async function handleDelete(id: string) {
    await deleteGeofence(id);
    refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Geofences</h2>
        <Button size="sm" onClick={() => setForm(EMPTY_FORM)}>
          <Plus className="h-4 w-4" /> Add geofence
        </Button>
      </div>

      {form && (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Edit geofence" : "New geofence"}</CardTitle>
            <p className="text-xs text-muted">
              {form.shape === "circle"
                ? "Click the map to set the center, then set a radius."
                : "Click the map to add vertices (3+ needed)."}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

            <div className="flex gap-2">
              {(["circle", "polygon"] as const).map((shape) => (
                <button
                  key={shape}
                  onClick={() => setForm({ ...form, shape, points: [] })}
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-xs capitalize ${
                    form.shape === shape ? "border-primary bg-primary/15 text-primary" : "border-border text-muted"
                  }`}
                >
                  {shape}
                </button>
              ))}
            </div>

            <div className="h-64 overflow-hidden rounded-lg border border-border">
              <MapContainer center={DUBAI_CENTER} zoom={11} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <ClickCapture onClick={handleMapClick} />
                {form.shape === "circle" && form.points[0] && (
                  <>
                    <Marker position={[form.points[0].lat, form.points[0].lng]} />
                    <Circle
                      center={[form.points[0].lat, form.points[0].lng]}
                      radius={form.radiusMeters}
                      pathOptions={{ color: "#3b82f6" }}
                    />
                  </>
                )}
                {form.shape === "polygon" && form.points.length >= 3 && (
                  <Polygon positions={form.points.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#3b82f6" }} />
                )}
              </MapContainer>
            </div>

            <div className="flex items-center justify-between text-xs text-muted">
              <span>{form.points.length} point(s) placed</span>
              {form.points.length > 0 && (
                <button onClick={undoLastPoint} className="text-primary hover:underline">
                  Undo last point
                </button>
              )}
            </div>

            {form.shape === "circle" && (
              <label className="text-xs text-muted">
                Radius (meters)
                <Input
                  type="number"
                  value={form.radiusMeters}
                  onChange={(e) => setForm({ ...form, radiusMeters: Number(e.target.value) })}
                  className="mt-1"
                />
              </label>
            )}

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={form.alertOnEntry}
                  onChange={(e) => setForm({ ...form, alertOnEntry: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                Alert on entry
              </label>
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={form.alertOnExit}
                  onChange={(e) => setForm({ ...form, alertOnExit: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                Alert on exit
              </label>
            </div>

            <div>
              <p className="mb-1 text-xs text-muted">Assigned vehicles</p>
              <div className="flex flex-wrap gap-2">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => toggleVehicle(v.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      form.assignedVehicleIds.includes(v.id)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted"
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-status-stopped">{error}</p>}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave}>
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {geofences.map((geofence) => (
          <Card key={geofence.id} className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm text-foreground">{geofence.name}</p>
              <p className="text-xs text-muted">
                {geofence.shape} · {geofence.assignedVehicleIds.length} vehicle(s) assigned
              </p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(geofence)} className="p-1.5 text-muted hover:text-foreground">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(geofence.id)} className="p-1.5 text-muted hover:text-status-stopped">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
