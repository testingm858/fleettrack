import type {
  AlertSummary,
  AlertThresholds,
  AlertType,
  CreateUserRequest,
  Driver,
  DriverContact,
  Geofence,
  LoginRequest,
  LoginResponse,
  NotificationPreferences,
  PaginatedAlerts,
  TelemetryPing,
  UnitPreferences,
  UpdateUserRequest,
  User,
  Vehicle,
  VehicleStatus,
} from "@fleettrack/shared-types";
import { getAuth, setAuth, updateAccessToken } from "./tokenStore";

// On a physical device/emulator, localhost won't reach a backend running on
// the dev machine — swap this for the machine's LAN IP or a tunnel URL when
// testing off the Expo web target.
export const API_BASE_URL = "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const auth = getAuth();
  if (!auth) return null;

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { accessToken: string };
        updateAccessToken(data.accessToken);
        return data.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function apiFetch<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const auth = getAuth();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (auth) headers.set("Authorization", `Bearer ${auth.accessToken}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && auth && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch<T>(path, options, true);
    setAuth(null);
    throw new ApiError(401, "Session expired");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getHealth(): Promise<{ status: string; service: string }> {
  return apiFetch("/api/health");
}

export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) });
}

export function getMe(): Promise<User> {
  return apiFetch("/api/auth/me");
}

export function getVehicles(): Promise<Vehicle[]> {
  return apiFetch("/api/vehicles");
}

export function getVehicleStatuses(): Promise<VehicleStatus[]> {
  return apiFetch("/api/vehicle-status");
}

export interface GetAlertsParams {
  vehicleId?: string;
  type?: AlertType;
  from?: string;
  to?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export function getAlerts(params: GetAlertsParams = {}): Promise<PaginatedAlerts> {
  const query = new URLSearchParams();
  if (params.vehicleId) query.set("vehicleId", params.vehicleId);
  if (params.type) query.set("type", params.type);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.search) query.set("search", params.search);
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return apiFetch(`/api/alerts${qs ? `?${qs}` : ""}`);
}

export function getGeofences(): Promise<Geofence[]> {
  return apiFetch("/api/geofences");
}

export function getAlertSummary(params: { from?: string; to?: string; vehicleId?: string } = {}): Promise<AlertSummary> {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.vehicleId) query.set("vehicleId", params.vehicleId);
  const qs = query.toString();
  return apiFetch(`/api/alerts/summary${qs ? `?${qs}` : ""}`);
}

export function getVehiclePings(vehicleId: string, limit = 50): Promise<TelemetryPing[]> {
  return apiFetch(`/api/vehicles/${vehicleId}/pings?limit=${limit}`);
}

export function getDriverContact(vehicleId: string): Promise<DriverContact | null> {
  return apiFetch(`/api/vehicles/${vehicleId}/driver-contact`);
}

export function setImmobilizer(vehicleId: string, enable: boolean): Promise<VehicleStatus> {
  return apiFetch(`/api/vehicles/${vehicleId}/immobilizer`, {
    method: "POST",
    body: JSON.stringify({ enable }),
  });
}

export interface VehicleFormInput {
  name: string;
  plateNumber: string;
  type: Vehicle["type"];
  imei: string;
  groupId?: string | null;
  iconType?: string;
  driverId?: string | null;
}

export function createVehicle(data: VehicleFormInput): Promise<Vehicle> {
  return apiFetch("/api/vehicles", { method: "POST", body: JSON.stringify(data) });
}

export function updateVehicle(id: string, data: Partial<VehicleFormInput>): Promise<Vehicle> {
  return apiFetch(`/api/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteVehicle(id: string): Promise<void> {
  return apiFetch(`/api/vehicles/${id}`, { method: "DELETE" });
}

export function getVehicleThresholds(vehicleId: string): Promise<AlertThresholds> {
  return apiFetch(`/api/vehicles/${vehicleId}/thresholds`);
}

export function updateVehicleThresholds(
  vehicleId: string,
  data: Partial<Omit<AlertThresholds, "vehicleId">>,
): Promise<AlertThresholds> {
  return apiFetch(`/api/vehicles/${vehicleId}/thresholds`, { method: "PATCH", body: JSON.stringify(data) });
}

export function getDrivers(): Promise<Driver[]> {
  return apiFetch("/api/drivers");
}

export interface DriverFormInput {
  name: string;
  phone: string;
  licenseNumber: string;
  assignedVehicleId?: string | null;
}

export function createDriver(data: DriverFormInput): Promise<Driver> {
  return apiFetch("/api/drivers", { method: "POST", body: JSON.stringify(data) });
}

export function updateDriver(id: string, data: Partial<DriverFormInput>): Promise<Driver> {
  return apiFetch(`/api/drivers/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteDriver(id: string): Promise<void> {
  return apiFetch(`/api/drivers/${id}`, { method: "DELETE" });
}

export interface GeofenceFormInput {
  name: string;
  shape: Geofence["shape"];
  coordinates: Geofence["coordinates"];
  radiusMeters?: number | null;
  alertOnEntry?: boolean;
  alertOnExit?: boolean;
  assignedVehicleIds?: string[];
}

export function createGeofence(data: GeofenceFormInput): Promise<Geofence> {
  return apiFetch("/api/geofences", { method: "POST", body: JSON.stringify(data) });
}

export function updateGeofence(id: string, data: Partial<GeofenceFormInput>): Promise<Geofence> {
  return apiFetch(`/api/geofences/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteGeofence(id: string): Promise<void> {
  return apiFetch(`/api/geofences/${id}`, { method: "DELETE" });
}

export function getUsers(): Promise<User[]> {
  return apiFetch("/api/users");
}

export function createUser(data: CreateUserRequest): Promise<User> {
  return apiFetch("/api/users", { method: "POST", body: JSON.stringify(data) });
}

export function updateUser(id: string, data: UpdateUserRequest): Promise<User> {
  return apiFetch(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteUser(id: string): Promise<void> {
  return apiFetch(`/api/users/${id}`, { method: "DELETE" });
}

export interface PreferencesResponse {
  notifications: NotificationPreferences;
  units: UnitPreferences;
}

export function getPreferences(): Promise<PreferencesResponse> {
  return apiFetch("/api/auth/me/preferences");
}

export function updatePreferences(data: Partial<PreferencesResponse>): Promise<PreferencesResponse> {
  return apiFetch("/api/auth/me/preferences", { method: "PATCH", body: JSON.stringify(data) });
}

export function registerPushToken(token: string): Promise<{ ok: true }> {
  return apiFetch("/api/auth/me/push-token", { method: "POST", body: JSON.stringify({ token }) });
}
