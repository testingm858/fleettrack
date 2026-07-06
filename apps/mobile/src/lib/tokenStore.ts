import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LoginResponse, User } from "@fleettrack/shared-types";

const STORAGE_KEY = "fleettrack.auth";

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: User;
}

let current: StoredAuth | null = null;
const listeners = new Set<(auth: StoredAuth | null) => void>();

function notify() {
  for (const listener of listeners) listener(current);
}

// AsyncStorage is async, unlike web's synchronous localStorage, so callers
// must await this once at startup before trusting getAuth()'s result.
export async function loadAuth(): Promise<StoredAuth | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    current = raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    current = null;
  }
  return current;
}

export function getAuth(): StoredAuth | null {
  return current;
}

export function setAuth(auth: LoginResponse | null) {
  current = auth;
  if (auth) {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(auth)).catch(() => undefined);
  } else {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }
  notify();
}

export function updateAccessToken(accessToken: string) {
  if (!current) return;
  current = { ...current, accessToken };
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => undefined);
  notify();
}

export function subscribeAuth(listener: (auth: StoredAuth | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
