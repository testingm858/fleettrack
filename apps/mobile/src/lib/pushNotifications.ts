import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerPushToken } from "./api";

// Client-side half of the push scaffold: request permission, get an Expo
// push token (works without a Firebase project — Expo's push service sits
// in front of FCM/APNs), and hand it to the backend. The backend's
// push.service.ts only logs what it *would* send until real credentials are
// wired up — see the TODO there.
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === "web") return; // No push support in the browser target.

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await registerPushToken(token);
  } catch (err) {
    // No EAS project configured yet in this scaffold — expected to fail
    // until one is set up, so this is intentionally non-fatal.
    console.log("[push] registration skipped:", err instanceof Error ? err.message : err);
  }
}
