import { useEffect, useState } from "react";
import type { AlertThresholds, Vehicle } from "@fleettrack/shared-types";
import { getVehicleThresholds, getVehicles, updateVehicleThresholds } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ThresholdsSettings() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [thresholds, setThresholds] = useState<AlertThresholds | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getVehicles().then((v) => {
      setVehicles(v);
      if (v[0]) setSelectedId(v[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedId) getVehicleThresholds(selectedId).then(setThresholds);
  }, [selectedId]);

  async function handleSave() {
    if (!thresholds) return;
    setIsSaving(true);
    setSaved(false);
    try {
      const updated = await updateVehicleThresholds(selectedId, {
        speedLimitKmh: thresholds.speedLimitKmh,
        idleThresholdSeconds: thresholds.idleThresholdSeconds,
        lowBatteryPct: thresholds.lowBatteryPct,
        offlineTimeoutSeconds: thresholds.offlineTimeoutSeconds,
      });
      setThresholds(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Thresholds</CardTitle>
        <p className="text-xs text-muted">Per-vehicle limits used by the alert-rule engine.</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        {thresholds && (
          <>
            <label className="text-xs text-muted">
              Speed limit (km/h)
              <Input
                type="number"
                value={thresholds.speedLimitKmh}
                onChange={(e) => setThresholds({ ...thresholds, speedLimitKmh: Number(e.target.value) })}
                className="mt-1"
              />
            </label>
            <label className="text-xs text-muted">
              Idle threshold (seconds)
              <Input
                type="number"
                value={thresholds.idleThresholdSeconds}
                onChange={(e) => setThresholds({ ...thresholds, idleThresholdSeconds: Number(e.target.value) })}
                className="mt-1"
              />
            </label>
            <label className="text-xs text-muted">
              Low battery (%)
              <Input
                type="number"
                value={thresholds.lowBatteryPct}
                onChange={(e) => setThresholds({ ...thresholds, lowBatteryPct: Number(e.target.value) })}
                className="mt-1"
              />
            </label>
            <label className="text-xs text-muted">
              Offline timeout (seconds)
              <Input
                type="number"
                value={thresholds.offlineTimeoutSeconds}
                onChange={(e) => setThresholds({ ...thresholds, offlineTimeoutSeconds: Number(e.target.value) })}
                className="mt-1"
              />
            </label>

            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
              {saved && <span className="text-xs text-status-running">Saved</span>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
