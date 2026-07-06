import type { Geofence, LatLng } from "@fleettrack/shared-types";

const EARTH_RADIUS_METERS = 6371000;

export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Ray-casting algorithm treating lat/lng as plane coordinates — accurate
// enough for city-scale geofences, not for polygons spanning many degrees.
function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const vi = polygon[i];
    const vj = polygon[j];
    const intersects =
      vi.lng > point.lng !== vj.lng > point.lng &&
      point.lat < ((vj.lat - vi.lat) * (point.lng - vi.lng)) / (vj.lng - vi.lng) + vi.lat;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isInsideGeofence(
  point: LatLng,
  geofence: Pick<Geofence, "shape" | "coordinates" | "radiusMeters">,
): boolean {
  if (geofence.shape === "circle") {
    const center = geofence.coordinates[0];
    if (!center || geofence.radiusMeters == null) return false;
    return haversineDistanceMeters(point, center) <= geofence.radiusMeters;
  }
  return pointInPolygon(point, geofence.coordinates);
}
