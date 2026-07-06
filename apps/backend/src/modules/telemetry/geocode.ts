// Reverse geocoding via Nominatim (OpenStreetMap) — free, no API key, which
// matches the no-key decision made for the map tiles. Nominatim's usage
// policy caps unauthenticated use at ~1 request/second, so this module
// enforces a process-wide minimum gap between calls and caches per-vehicle
// results for a short window so a 4-vehicle fleet pinging every few seconds
// doesn't hammer the endpoint. Ingestion never fails because of this — any
// error just falls back to the last known address (or null).

interface CacheEntry {
  address: string | null;
  at: number;
}

const CACHE_TTL_MS = 30_000;
const MIN_GAP_MS = 1100;

const cache = new Map<string, CacheEntry>();
let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

async function throttledFetch(url: string): Promise<Response> {
  return (queue = queue.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_GAP_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      return await fetch(url, {
        headers: { "User-Agent": "FleetTrack-Dev/1.0 (local development)" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  })) as Promise<Response>;
}

export async function reverseGeocode(vehicleId: string, lat: number, lng: number): Promise<string | null> {
  const cached = cache.get(vehicleId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.address;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16`;
    const res = await throttledFetch(url);
    if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);

    const data = (await res.json()) as { display_name?: string };
    const address = data.display_name ?? null;
    cache.set(vehicleId, { address, at: Date.now() });
    return address;
  } catch {
    // Network hiccup or rate limit — keep serving the last known address
    // rather than blocking or failing the ingestion request.
    return cached?.address ?? null;
  }
}
