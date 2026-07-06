import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Vehicle, VehicleType } from "@fleettrack/shared-types";
import { createVehicle, deleteVehicle, getDrivers, getVehicles, updateVehicle } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VEHICLE_TYPES: VehicleType[] = ["car", "bike", "truck"];

interface FormState {
  id: string | null;
  name: string;
  plateNumber: string;
  type: VehicleType;
  imei: string;
  driverId: string;
}

const EMPTY_FORM: FormState = { id: null, name: "", plateNumber: "", type: "car", imei: "", driverId: "" };

export function VehiclesSettings() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getVehicles().then(setVehicles);
    getDrivers().then((d) => setDrivers(d.map((driver) => ({ id: driver.id, name: driver.name }))));
  }

  useEffect(refresh, []);

  function startEdit(vehicle: Vehicle) {
    setForm({
      id: vehicle.id,
      name: vehicle.name,
      plateNumber: vehicle.plateNumber,
      type: vehicle.type,
      imei: vehicle.imei,
      driverId: vehicle.driverId ?? "",
    });
  }

  async function handleSubmit() {
    if (!form) return;
    setError(null);
    const payload = {
      name: form.name,
      plateNumber: form.plateNumber,
      type: form.type,
      imei: form.imei,
      iconType: form.type,
      driverId: form.driverId || null,
    };
    try {
      if (form.id) {
        await updateVehicle(form.id, payload);
      } else {
        await createVehicle(payload);
      }
      setForm(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vehicle");
    }
  }

  async function handleDelete(id: string) {
    await deleteVehicle(id);
    refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Vehicles</h2>
        <Button size="sm" onClick={() => setForm(EMPTY_FORM)}>
          <Plus className="h-4 w-4" /> Add vehicle
        </Button>
      </div>

      {form && (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Edit vehicle" : "New vehicle"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input
              placeholder="Plate number"
              value={form.plateNumber}
              onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
            />
            <Input placeholder="IMEI" value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })}
              className="h-10 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={form.driverId}
              onChange={(e) => setForm({ ...form, driverId: e.target.value })}
              className="h-10 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
            >
              <option value="">No driver assigned</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {error && <p className="text-xs text-status-stopped">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSubmit}>
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm text-foreground">{vehicle.name}</p>
              <p className="text-xs text-muted">
                {vehicle.plateNumber} · {vehicle.type} · {drivers.find((d) => d.id === vehicle.driverId)?.name ?? "No driver"}
              </p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(vehicle)} className="p-1.5 text-muted hover:text-foreground">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(vehicle.id)} className="p-1.5 text-muted hover:text-status-stopped">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
