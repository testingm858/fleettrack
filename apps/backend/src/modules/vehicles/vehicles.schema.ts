import { z } from "zod";

export const vehicleTypeSchema = z.enum(["car", "bike", "truck"]);

export const createVehicleSchema = z.object({
  name: z.string().min(1),
  plateNumber: z.string().min(1),
  type: vehicleTypeSchema,
  imei: z.string().min(1),
  groupId: z.string().nullable().optional(),
  iconType: z.string().min(1).optional(),
  driverId: z.string().nullable().optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();
