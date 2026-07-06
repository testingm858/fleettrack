import { z } from "zod";

const latLngSchema = z.object({ lat: z.number(), lng: z.number() });

export const createGeofenceSchema = z
  .object({
    name: z.string().min(1),
    shape: z.enum(["circle", "polygon"]),
    coordinates: z.array(latLngSchema).min(1),
    radiusMeters: z.number().positive().nullable().optional(),
    alertOnEntry: z.boolean().optional(),
    alertOnExit: z.boolean().optional(),
    assignedVehicleIds: z.array(z.string()).optional(),
  })
  .refine((geofence) => geofence.shape !== "circle" || geofence.coordinates.length === 1, {
    message: "A circle geofence needs exactly one coordinate (its center)",
    path: ["coordinates"],
  })
  .refine((geofence) => geofence.shape !== "circle" || geofence.radiusMeters != null, {
    message: "A circle geofence requires radiusMeters",
    path: ["radiusMeters"],
  })
  .refine((geofence) => geofence.shape !== "polygon" || geofence.coordinates.length >= 3, {
    message: "A polygon geofence needs at least 3 coordinates",
    path: ["coordinates"],
  });

// Partial updates skip the shape-dependent refinements above — a PATCH may
// only touch one field (e.g. toggling alertOnEntry) without the caller
// having to resend a complete, shape-valid geofence body.
export const updateGeofenceSchema = z.object({
  name: z.string().min(1).optional(),
  shape: z.enum(["circle", "polygon"]).optional(),
  coordinates: z.array(latLngSchema).min(1).optional(),
  radiusMeters: z.number().positive().nullable().optional(),
  alertOnEntry: z.boolean().optional(),
  alertOnExit: z.boolean().optional(),
  assignedVehicleIds: z.array(z.string()).optional(),
});
