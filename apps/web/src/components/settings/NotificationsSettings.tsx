import { useEffect, useState } from "react";
import { ALERT_TYPES, type NotificationChannel, type NotificationPreferences } from "@fleettrack/shared-types";
import { getPreferences, updatePreferences } from "@/lib/api";
import { ALERT_TYPE_CONFIG } from "@/lib/alertTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHANNELS: NotificationChannel[] = ["push", "sms", "email"];

export function NotificationsSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    getPreferences().then((p) => setPrefs(p.notifications));
  }, []);

  async function toggle(type: keyof NotificationPreferences, channel: NotificationChannel) {
    if (!prefs) return;
    const next = { ...prefs, [type]: { ...prefs[type], [channel]: !prefs[type][channel] } };
    setPrefs(next);
    await updatePreferences({ notifications: next });
  }

  if (!prefs) return <p className="text-sm text-muted">Loading preferences…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <p className="text-xs text-muted">
          Push is wired to delivery; SMS/email toggles are saved but not yet connected to a sender.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-2 pr-2">Alert type</th>
                {CHANNELS.map((c) => (
                  <th key={c} className="pb-2 px-2 text-center capitalize">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALERT_TYPES.map((type) => (
                <tr key={type} className="border-t border-border">
                  <td className="py-2 pr-2 text-foreground">{ALERT_TYPE_CONFIG[type].label}</td>
                  {CHANNELS.map((channel) => (
                    <td key={channel} className="py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={prefs[type][channel]}
                        onChange={() => toggle(type, channel)}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
