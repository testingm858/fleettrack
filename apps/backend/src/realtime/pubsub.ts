import { EventEmitter } from "node:events";

// Minimal pub/sub interface so the rest of the app never touches EventEmitter
// or a Redis client directly. Swap this file's implementation for a
// Redis-backed one (e.g. ioredis pub/sub) when scaling beyond a single
// backend instance — nothing else in the codebase needs to change.
export interface PubSub {
  publish<T>(channel: string, payload: T): void;
  subscribe<T>(channel: string, handler: (payload: T) => void): () => void;
}

class InMemoryPubSub implements PubSub {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  publish<T>(channel: string, payload: T): void {
    this.emitter.emit(channel, payload);
  }

  subscribe<T>(channel: string, handler: (payload: T) => void): () => void {
    this.emitter.on(channel, handler);
    return () => this.emitter.off(channel, handler);
  }
}

export const pubsub: PubSub = new InMemoryPubSub();

export const CHANNELS = {
  vehicleStatusUpdated: "vehicle:status:updated",
  alertCreated: "alert:created",
} as const;
