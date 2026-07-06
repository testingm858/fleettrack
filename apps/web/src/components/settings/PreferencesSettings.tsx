import { useEffect, useState } from "react";
import type { UnitPreferences } from "@fleettrack/shared-types";
import { getPreferences, updatePreferences } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PreferencesSettings() {
  const [units, setUnits] = useState<UnitPreferences | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getPreferences().then((prefs) => setUnits(prefs.units));
  }, []);

  async function updateUnit<K extends keyof UnitPreferences>(key: K, value: UnitPreferences[K]) {
    if (!units) return;
    const next = { ...units, [key]: value };
    setUnits(next);
    setIsSaving(true);
    try {
      await updatePreferences({ units: next });
    } finally {
      setIsSaving(false);
    }
  }

  if (!units) return <p className="text-sm text-muted">Loading preferences…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <p className="text-xs text-muted">
          Saved to your account.{" "}
          {isSaving && <span className="text-primary">Saving…</span>}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-medium text-foreground">Distance unit</p>
          <div className="flex gap-2">
            {(["km", "mi"] as const).map((option) => (
              <button
                key={option}
                onClick={() => updateUnit("distanceUnit", option)}
                className={`rounded-lg border px-3 py-1.5 text-xs ${
                  units.distanceUnit === option
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted"
                }`}
              >
                {option === "km" ? "Kilometers" : "Miles"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-foreground">Time format</p>
          <div className="flex gap-2">
            {(["12h", "24h"] as const).map((option) => (
              <button
                key={option}
                onClick={() => updateUnit("timeFormat", option)}
                className={`rounded-lg border px-3 py-1.5 text-xs ${
                  units.timeFormat === option ? "border-primary bg-primary/15 text-primary" : "border-border text-muted"
                }`}
              >
                {option === "12h" ? "12-hour" : "24-hour"}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted">
          Note: these preferences are saved but not yet applied to displays elsewhere in the app — that wiring lands
          in a later pass.
        </p>
      </CardContent>
    </Card>
  );
}
