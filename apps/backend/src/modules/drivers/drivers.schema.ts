import { z } from "zod";

export const createDriverSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  licenseNumber: z.string().min(1),
  assignedVehicleId: z.string().nullable().optional(),
});

export const updateDriverSchema = createDriverSchema.partial();
