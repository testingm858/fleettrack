-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "assignedVehicleId" TEXT,
    CONSTRAINT "Driver_assignedVehicleId_fkey" FOREIGN KEY ("assignedVehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "groupId" TEXT,
    "iconType" TEXT NOT NULL DEFAULT 'car',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TelemetryPing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "speed" REAL NOT NULL,
    "heading" REAL NOT NULL,
    "ignition" BOOLEAN NOT NULL,
    "immobilizer" BOOLEAN NOT NULL,
    "charging" BOOLEAN NOT NULL,
    "batteryPct" REAL NOT NULL,
    "satelliteCount" INTEGER NOT NULL,
    "rssiPct" INTEGER NOT NULL,
    "odometerKm" REAL NOT NULL,
    "address" TEXT,
    CONSTRAINT "TelemetryPing_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VehicleStatus" (
    "vehicleId" TEXT NOT NULL PRIMARY KEY,
    "currentStatus" TEXT NOT NULL,
    "lastPing" DATETIME,
    "lastLat" REAL,
    "lastLng" REAL,
    "speed" REAL NOT NULL DEFAULT 0,
    "heading" REAL NOT NULL DEFAULT 0,
    "ignition" BOOLEAN NOT NULL DEFAULT false,
    "immobilizer" BOOLEAN NOT NULL DEFAULT false,
    "charging" BOOLEAN NOT NULL DEFAULT false,
    "batteryPct" REAL NOT NULL DEFAULT 0,
    "satelliteCount" INTEGER NOT NULL DEFAULT 0,
    "rssiPct" INTEGER NOT NULL DEFAULT 0,
    "odometerKm" REAL NOT NULL DEFAULT 0,
    "address" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VehicleStatus_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "address" TEXT,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Alert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Geofence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shape" TEXT NOT NULL,
    "coordinatesJson" TEXT NOT NULL,
    "radiusMeters" REAL,
    "alertOnEntry" BOOLEAN NOT NULL DEFAULT true,
    "alertOnExit" BOOLEAN NOT NULL DEFAULT true,
    "assignedVehicleIdsJson" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "AlertThreshold" (
    "vehicleId" TEXT NOT NULL PRIMARY KEY,
    "speedLimitKmh" REAL NOT NULL DEFAULT 120,
    "idleThresholdSeconds" INTEGER NOT NULL DEFAULT 300,
    "lowBatteryPct" REAL NOT NULL DEFAULT 20,
    "offlineTimeoutSeconds" INTEGER NOT NULL DEFAULT 1800,
    CONSTRAINT "AlertThreshold_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_assignedVehicleId_key" ON "Driver"("assignedVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_imei_key" ON "Vehicle"("imei");

-- CreateIndex
CREATE INDEX "TelemetryPing_vehicleId_timestamp_idx" ON "TelemetryPing"("vehicleId", "timestamp");

-- CreateIndex
CREATE INDEX "Alert_vehicleId_timestamp_idx" ON "Alert"("vehicleId", "timestamp");

-- CreateIndex
CREATE INDEX "Alert_type_timestamp_idx" ON "Alert"("type", "timestamp");
