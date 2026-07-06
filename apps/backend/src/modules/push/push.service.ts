import type { Alert as SharedAlert } from "@fleettrack/shared-types";
import { prisma } from "../../db/prisma.js";

// High-priority alerts that should reach a driver/manager even if the app is
// backgrounded — everything else surfaces only through the in-app feed.
const HIGH_PRIORITY_TYPES: SharedAlert["type"][] = ["sos", "power_alert"];

export function isHighPriorityAlert(type: SharedAlert["type"]): boolean {
  return HIGH_PRIORITY_TYPES.includes(type);
}

// TODO(push-integration): this only logs — wire it up to a real push
// provider once credentials exist. Expo's push API (no Firebase project
// needed, just an Expo access token) is the lowest-friction option since the
// client already registers Expo push tokens; swap to raw FCM here if you
// need it later. Either way this is the single place that needs to change —
// callers only depend on `notifyUsers`, not on which provider sends it.
async function deliverPush(token: string, title: string, body: string): Promise<void> {
  console.log(`[push:TODO] Would send push to ${token}: ${title} — ${body}`);
}

export async function notifyHighPriorityAlert(alert: SharedAlert, vehicleName: string): Promise<void> {
  if (!isHighPriorityAlert(alert.type)) return;

  // In a multi-tenant build this would target the fleet's admins/managers
  // specifically; for now it fans out to every user with a registered
  // token, since there's only ever one fleet in this scaffold.
  const recipients = await prisma.user.findMany({
    where: { pushToken: { not: null } },
    select: { pushToken: true },
  });

  const title = alert.type === "sos" ? "SOS alert" : "Power disconnected";
  const body = `${vehicleName}: ${alert.address ?? `${alert.lat.toFixed(4)}, ${alert.lng.toFixed(4)}`}`;

  await Promise.all(recipients.map((r) => deliverPush(r.pushToken!, title, body)));
}
