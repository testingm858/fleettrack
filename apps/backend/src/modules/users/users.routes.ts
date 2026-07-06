import { Router } from "express";
import { z } from "zod";
import type { User as SharedUser } from "@fleettrack/shared-types";
import { prisma } from "../../db/prisma.js";
import { hashPassword } from "../auth/auth.service.js";
import { requireAuth, requireRole, type AuthedRequest } from "../auth/auth.middleware.js";

// Fleet-wide user/role management — deliberately admin-only, distinct from
// a user managing their own profile (that's /api/auth/me).
export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole("admin"));

function toSharedUser(user: { id: string; name: string; email: string; role: string }): SharedUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role as SharedUser["role"] };
}

usersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  res.json(users.map(toSharedUser));
});

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "fleet_manager", "driver", "viewer"]),
});

usersRouter.post("/", async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: "A user with this email already exists" });

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash, role: parsed.data.role },
  });
  res.status(201).json(toSharedUser(user));
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "fleet_manager", "driver", "viewer"]).optional(),
});

usersRouter.patch("/:id", async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "User not found" });

  const user = await prisma.user.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(toSharedUser(user));
});

usersRouter.delete("/:id", async (req: AuthedRequest, res) => {
  if (req.params.id === req.user!.sub) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "User not found" });

  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
