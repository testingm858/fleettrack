import { io, type Socket } from "socket.io-client";
import type { Alert, VehicleStatus } from "@fleettrack/shared-types";
import { API_BASE_URL } from "./api";

interface ServerToClientEvents {
  "vehicle:status": (status: VehicleStatus) => void;
  "alert:new": (alert: Alert) => void;
}

let socket: Socket<ServerToClientEvents> | null = null;

// A single shared connection for the whole app — every screen that needs
// live updates subscribes to this instead of opening its own socket.
export function getSocket(): Socket<ServerToClientEvents> {
  if (!socket) {
    socket = io(API_BASE_URL, { transports: ["websocket"], autoConnect: true });
  }
  return socket;
}
