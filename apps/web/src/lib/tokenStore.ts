import type { LoginResponse, User } from "@fleettrack/shared-types";

const STORAGE_KEY = "fleettrack.auth";

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: User;
}

let current: StoredAuth | null = readFromStorage();
const listeners = new Set<(auth: StoredAuth | null) => void>();

function readFromStorage(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

function notify() {
  for (const listener of listeners) listener(current);
}

export function getAuth(): StoredAuth | null {
  return current;
}

export function setAuth(auth: LoginResponse | null) {
  current = auth;
  if (auth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  notify();
}

export function updateAccessToken(accessToken: string) {
  if (!current) return;
  current = { ...current, accessToken };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  notify();
}

export function subscribeAuth(listener: (auth: StoredAuth | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
