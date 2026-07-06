import { Router } from "express";
import { z } from "zod";
import type { LoginResponse, User as SharedUser } from "@fleettrack/shared-types";
import { DEFAULT_NOTIFICATION_PREFERENCES, DEFAULT_UNIT_PREFERENCES } from "@fleettrack/shared-types";
import { prisma } from "../../db/prisma.js";
import {
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./auth.service.js";
import { requireAuth, type AuthedRequest } from "./auth.middleware.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toSharedUser(user: { id: string; name: string; email: string; role: string }): SharedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as SharedUser["role"],
  };
}

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await comparePassword(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role as SharedUser["role"] });
  const refreshToken = signRefreshToken({ sub: user.id });

  const body: LoginResponse = { accessToken, refreshToken, user: toSharedUser(user) };
  res.json(body);
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRouter.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const { sub } = verifyRefreshToken(parsed.data.refreshToken);
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user) return res.status(401).json({ error: "User no longer exists" });

    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role as SharedUser["role"] });
    res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(toSharedUser(user));
});

authRouter.get("/me/preferences", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(user.notificationPrefsJson) },
    units: { ...DEFAULT_UNIT_PREFERENCES, ...JSON.parse(user.unitPrefsJson) },
  });
});

const updatePreferencesSchema = z.object({
  notifications: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
  units: z.object({ distanceUnit: z.enum(["km", "mi"]), timeFormat: z.enum(["12h", "24h"]) }).partial().optional(),
});

authRouter.patch("/me/preferences", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = updatePreferencesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const notifications = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(user.notificationPrefsJson), ...parsed.data.notifications };
  const units = { ...DEFAULT_UNIT_PREFERENCES, ...JSON.parse(user.unitPrefsJson), ...parsed.data.units };

  await prisma.user.update({
    where: { id: req.user!.sub },
    data: { notificationPrefsJson: JSON.stringify(notifications), unitPrefsJson: JSON.stringify(units) },
  });

  res.json({ notifications, units });
});

const pushTokenSchema = z.object({ token: z.string().min(1) });

// Expo push tokens (not raw FCM tokens) — the client registers whatever its
// push provider gives it; see push.service.ts for why Expo's push API is the
// path of least resistance for actually delivering these later.
authRouter.post("/me/push-token", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = pushTokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  await prisma.user.update({ where: { id: req.user!.sub }, data: { pushToken: parsed.data.token } });
  res.json({ ok: true });
});
