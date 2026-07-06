import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Driver } from "@fleettrack/shared-types";
import { createDriver, deleteDriver, getDrivers, updateDriver } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FormState {
  id: string | null;
  name: string;
  phone: string;
  licenseNumber: string;
}

const EMPTY_FORM: FormState = { id: null, name: "", phone: "", licenseNumber: "" };

export function DriversSettings() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getDrivers().then(setDrivers);
  }

  useEffect(refresh, []);

  async function handleSubmit() {
    if (!form) return;
    setError(null);
    const payload = { name: form.name, phone: form.phone, licenseNumber: form.licenseNumber };
    try {
      if (form.id) {
        await updateDriver(form.id, payload);
      } else {
        await createDriver(payload);
      }
      setForm(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save driver");
    }
  }

  async function handleDelete(id: string) {
    await deleteDriver(id);
    refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Drivers</h2>
        <Button size="sm" onClick={() => setForm(EMPTY_FORM)}>
          <Plus className="h-4 w-4" /> Add driver
        </Button>
      </div>

      {form && (
        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Edit driver" : "New driver"}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input
              placeholder="Phone (for Call Driver button)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              placeholder="License number"
              value={form.licenseNumber}
              onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
            />
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
        {drivers.map((driver) => (
          <Card key={driver.id} className="flex items-center justify-between p-3">
            <div>
              <p className="text-sm text-foreground">{driver.name}</p>
              <p className="text-xs text-muted">
                {driver.phone} · {driver.licenseNumber}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setForm({ id: driver.id, name: driver.name, phone: driver.phone, licenseNumber: driver.licenseNumber })}
                className="p-1.5 text-muted hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(driver.id)} className="p-1.5 text-muted hover:text-status-stopped">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
