import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import type { VehicleStatus, Alert } from "@fleettrack/shared-types";
import { env } from "../env.js";
import { CHANNELS, pubsub } from "./pubsub.js";

export const FLEET_ROOM = "fleet";

export function createSocketGateway(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: env.corsOrigins },
  });

  io.on("connection", (socket) => {
    // All clients join the single fleet room for now; per-tenant/per-vehicle
    // rooms land alongside auth + multi-tenancy in a later step.
    socket.join(FLEET_ROOM);

    socket.on("disconnect", () => {
      socket.leave(FLEET_ROOM);
    });
  });

  pubsub.subscribe<VehicleStatus>(CHANNELS.vehicleStatusUpdated, (status) => {
    io.to(FLEET_ROOM).emit("vehicle:status", status);
  });

  pubsub.subscribe<Alert>(CHANNELS.alertCreated, (alert) => {
    io.to(FLEET_ROOM).emit("alert:new", alert);
  });

  return io;
}
