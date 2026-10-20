import crypto from "node:crypto";
import type { AuthUser } from "@workspace/api-zod";
import { db, sessionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { Request, Response } from "express";

export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
export const ADMIN_SESSION_USER_ID = "pin-admin";
const PIN_LOGIN_LIMIT_PREFIX = "admin-pin-rate:";
const PIN_LOGIN_MAX_ATTEMPTS = 5;
const PIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
}

const PIN_ADMIN_USER: AuthUser = {
  id: ADMIN_SESSION_USER_ID,
  email: null,
  firstName: null,
  lastName: null,
  profileImageUrl: null,
  isAdmin: true,
};

export function isAdminPinConfigured(): boolean {
  return /^\d{4}$/.test(process.env.ADMIN_PIN ?? "");
}

export function authenticateAdminPin(pin: string): AuthUser | null {
  const expectedPin = process.env.ADMIN_PIN;
  if (!isAdminPinConfigured() || !expectedPin) return null;

  const submitted = Buffer.from(pin, "utf8");
  const expected = Buffer.from(expectedPin, "utf8");
  if (submitted.length !== expected.length || !crypto.timingSafeEqual(submitted, expected)) return null;
  return { ...PIN_ADMIN_USER };
}

export function getPinLoginRateLimitKey(clientAddress: string): string {
  const addressHash = crypto.createHash("sha256").update(clientAddress).digest("hex");
  return `${PIN_LOGIN_LIMIT_PREFIX}${addressHash}`;
}

export async function consumePinLoginAttempt(clientAddress: string): Promise<{ key: string; allowed: boolean }> {
  const key = getPinLoginRateLimitKey(clientAddress);
  const [row] = await db.insert(sessionsTable).values({
    sid: key,
    sess: { kind: "admin-pin-rate-limit", attempts: 1 },
    expire: new Date(Date.now() + PIN_LOGIN_WINDOW_MS),
  }).onConflictDoUpdate({
    target: sessionsTable.sid,
    set: {
      sess: sql`
        CASE
          WHEN ${sessionsTable.expire} <= now()
            THEN jsonb_build_object('kind', 'admin-pin-rate-limit', 'attempts', 1)
          ELSE jsonb_set(
            ${sessionsTable.sess},
            '{attempts}',
            to_jsonb(LEAST(COALESCE((${sessionsTable.sess} ->> 'attempts')::integer, 0) + 1, ${PIN_LOGIN_MAX_ATTEMPTS + 1})),
            true
          )
        END
      `,
      expire: sql`
        CASE
          WHEN ${sessionsTable.expire} <= now()
            THEN now() + interval '15 minutes'
          ELSE ${sessionsTable.expire}
        END
      `,
    },
  }).returning({ sess: sessionsTable.sess });

  const attempts = Number((row.sess as { attempts?: unknown } | null)?.attempts ?? 0);
  return { key, allowed: attempts <= PIN_LOGIN_MAX_ATTEMPTS };
}

export async function clearPinLoginAttempts(key: string): Promise<void> {
  if (!key.startsWith(PIN_LOGIN_LIMIT_PREFIX)) return;
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, key));
}

export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  await db.insert(sessionsTable).values({ sid, sess: data as unknown as Record<string, unknown>, expire: new Date(Date.now() + SESSION_TTL) });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const [row] = await db.select().from(sessionsTable).where(eq(sessionsTable.sid, sid));
  if (!row || row.expire < new Date()) {
    if (row) await deleteSession(sid);
    return null;
  }
  return row.sess as unknown as SessionData;
}

export async function deleteSession(sid: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
}

export async function clearSession(res: Response, sid?: string): Promise<void> {
  if (sid && !sid.startsWith(PIN_LOGIN_LIMIT_PREFIX)) await deleteSession(sid);
  clearSessionCookie(res);
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.[SESSION_COOKIE];
}

export function setSessionCookie(res: Response, sid: string): void {
  // SameSite=None is required when a separately hosted frontend calls the API
  // with credentials; Secure remains enabled for browser cookie policy.
  res.cookie(SESSION_COOKIE, sid, { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: SESSION_TTL });
}