import { PrismaClient } from "@prisma/client";

// Single shared client, standard practice with tsx watch to avoid exhausting
// SQLite connections across hot reloads.
export const prisma = new PrismaClient();
