// Shared TypeScript types used by backend, web, and mobile.
// Kept dependency-free so it can be imported from Node and React Native alike.

export type VehicleType = "car" | "bike" | "truck";

export type VehicleStatusValue = "running" | "stopped" | "idle" | "offline";

export type UserRole = "admin" | "fleet_manager" | "driver" | "viewer";

export type AlertType =
  | "ignition_on"
  | "ignition_off"
  | "zone_in"
  | "zone_out"
  | "power_alert"
  | "overspeed"
  | "harsh_braking"
  | "sos"
  | "low_battery"
  | "geofence_violation"
  | "idle_time_exceeded";

export const ALERT_TYPES: AlertType[] = [
  "ignition_on",
  "ignition_off",
  "zone_in",
  "zone_out",
  "power_alert",
  "overspeed",
  "harsh_braking",
  "sos",
  "low_battery",
  "geofence_violation",
  "idle_time_exceeded",
];

export type GeofenceShape = "circle" | "polygon";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Vehicle {
  id: string;
  name: string;
  plateNumber: string;
  type: VehicleType;
  imei: string;
  driverId: string | null;
  groupId: string | null;
  iconType: string;
  createdAt: string;
}

export interface TelemetryPing {
  id: string;
  vehicleId: string;
  timestamp: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  ignition: boolean;
  immobilizer: boolean;
  charging: boolean;
  batteryPct: number;
  satelliteCount: number;
  rssiPct: number;
  odometerKm: number;
  address: string | null;
}

export interface VehicleStatus {
  vehicleId: string;
  currentStatus: VehicleStatusValue;
  lastPing: string | null;
  lastKnownLocation: LatLng | null;
  speed: number;
  heading: number;
  ignition: boolean;
  immobilizer: boolean;
  charging: boolean;
  batteryPct: number;
  satelliteCount: number;
  rssiPct: number;
  odometerKm: number;
  address: string | null;
}

export interface Alert {
  id: string;
  vehicleId: string;
  type: AlertType;
  timestamp: string;
  lat: number;
  lng: number;
  address: string | null;
  acknowledged: boolean;
}

export interface Geofence {
  id: string;
  name: string;
  shape: GeofenceShape;
  coordinates: LatLng[]; // polygon vertices, or [center] when shape === "circle"
  radiusMeters: number | null; // used when shape === "circle"
  alertOnEntry: boolean;
  alertOnExit: boolean;
  assignedVehicleIds: string[];
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  assignedVehicleId: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Alert / status thresholds, configurable per vehicle in Settings.
export interface AlertThresholds {
  vehicleId: string;
  speedLimitKmh: number;
  idleThresholdSeconds: number;
  lowBatteryPct: number;
  offlineTimeoutSeconds: number;
}

// Raw inbound packet shape from the ingestion adapter layer, before
// protocol-specific parsing (GT06/JT808/etc.) normalizes it into a TelemetryPing.
export interface RawDevicePacket {
  imei: string;
  raw: unknown;
  receivedAt: string;
}

export const DEFAULT_ALERT_THRESHOLDS: Omit<AlertThresholds, "vehicleId"> = {
  speedLimitKmh: 120,
  idleThresholdSeconds: 300,
  lowBatteryPct: 20,
  offlineTimeoutSeconds: 1800,
};

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface DriverContact {
  name: string;
  phone: string;
}

export interface SetImmobilizerRequest {
  enable: boolean;
}

export interface AlertSummary {
  total: number;
  byType: Partial<Record<AlertType, number>>;
}

export interface PaginatedAlerts {
  alerts: Alert[];
  nextCursor: string | null;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  role?: UserRole;
}

// push/SMS/email toggle per alert type, per user.
export type NotificationChannel = "push" | "sms" | "email";
export type NotificationPreferences = Record<AlertType, Record<NotificationChannel, boolean>>;

export interface UnitPreferences {
  distanceUnit: "km" | "mi";
  timeFormat: "12h" | "24h";
}

// Push is the only channel actually wired to a delivery mechanism (FCM) in
// this build, so it defaults on; SMS/email default off since toggling them
// currently has no effect — the toggles exist for the settings UI ahead of
// that integration landing.
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = Object.fromEntries(
  ALERT_TYPES.map((type) => [type, { push: true, sms: false, email: false }]),
) as NotificationPreferences;

export const DEFAULT_UNIT_PREFERENCES: UnitPreferences = {
  distanceUnit: "km",
  timeFormat: "24h",
};


