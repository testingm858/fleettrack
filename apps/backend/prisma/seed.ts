import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

// Dev-only credentials, all using the same password for convenience.
const DEV_PASSWORD = "fleettrack-dev";

const VEHICLES = [
  { name: "Truck 01", plateNumber: "DXB-A-11201", type: "truck", iconType: "truck" },
  { name: "Van 04", plateNumber: "DXB-B-33920", type: "car", iconType: "car" },
  { name: "Bike 12", plateNumber: "DXB-C-77510", type: "bike", iconType: "bike" },
  { name: "Sedan 02", plateNumber: "DXB-A-90042", type: "car", iconType: "car" },
];

const DRIVERS = [
  { name: "Arif Khan", phone: "+971501234567", licenseNumber: "DL-88213" },
  { name: "Meera Nair", phone: "+971502345678", licenseNumber: "DL-88214" },
  { name: "Omar Saeed", phone: "+971503456789", licenseNumber: "DL-88215" },
  { name: "Fatima Rahman", phone: "+971504567890", licenseNumber: "DL-88216" },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: "admin@fleettrack.dev" },
    update: {},
    create: { name: "Fleet Admin", email: "admin@fleettrack.dev", passwordHash, role: "admin" },
  });
  await prisma.user.upsert({
    where: { email: "manager@fleettrack.dev" },
    update: {},
    create: { name: "Fleet Manager", email: "manager@fleettrack.dev", passwordHash, role: "fleet_manager" },
  });
  await prisma.user.upsert({
    where: { email: "viewer@fleettrack.dev" },
    update: {},
    create: { name: "Fleet Viewer", email: "viewer@fleettrack.dev", passwordHash, role: "viewer" },
  });

  let firstDriverUserSeeded = false;

  for (let i = 0; i < VEHICLES.length; i++) {
    const v = VEHICLES[i];
    const d = DRIVERS[i];

    const driver = await prisma.driver.upsert({
      where: { licenseNumber: d.licenseNumber },
      update: {},
      create: { name: d.name, phone: d.phone, licenseNumber: d.licenseNumber },
    });

    const vehicle = await prisma.vehicle.upsert({
      where: { plateNumber: v.plateNumber },
      update: {},
      create: {
        name: v.name,
        plateNumber: v.plateNumber,
        type: v.type,
        iconType: v.iconType,
        imei: randomUUID().replace(/-/g, "").slice(0, 15),
      },
    });

    await prisma.driver.update({
      where: { id: driver.id },
      data: { assignedVehicleId: vehicle.id },
    });

    await prisma.alertThreshold.upsert({
      where: { vehicleId: vehicle.id },
      update: {},
      create: { vehicleId: vehicle.id },
    });

    await prisma.vehicleStatus.upsert({
      where: { vehicleId: vehicle.id },
      update: {},
      create: { vehicleId: vehicle.id, currentStatus: "offline" },
    });

    // Give the first driver a login so the "driver" role can be exercised —
    // the rest stay login-less, matching real fleets where not every driver
    // has app access.
    if (!firstDriverUserSeeded) {
      await prisma.user.upsert({
        where: { email: "driver@fleettrack.dev" },
        update: {},
        create: {
          name: d.name,
          email: "driver@fleettrack.dev",
          passwordHash,
          role: "driver",
          driverId: driver.id,
        },
      });
      firstDriverUserSeeded = true;
    }
  }

  console.log(`Seeded ${VEHICLES.length} vehicles, drivers, and one user per role (password: ${DEV_PASSWORD}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
