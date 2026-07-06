import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRole } from "@fleettrack/shared-types";
import { env } from "../../env.js";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: ACCESS_TOKEN_TTL });
}

export function signRefreshToken(payload: Pick<AccessTokenPayload, "sub">): string {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): Pick<AccessTokenPayload, "sub"> {
  return jwt.verify(token, env.jwtRefreshSecret) as Pick<AccessTokenPayload, "sub">;
}
