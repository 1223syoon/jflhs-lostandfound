import crypto from "node:crypto";
import type { AuthUser } from "@workspace/api-zod";
import { adminAccountsTable, db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

export async function ensureAdminAccount(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const [existing] = await db.select().from(adminAccountsTable).where(eq(adminAccountsTable.email, email));
  if (!existing) {
    await db.insert(adminAccountsTable).values({ email, passwordHash: hashPassword(password) });
  }
}

export async function authenticateAdmin(email: string, password: string): Promise<AuthUser | null> {
  const [account] = await db.select().from(adminAccountsTable).where(eq(adminAccountsTable.email, email.trim().toLowerCase()));
  if (!account || !verifyPassword(password, account.passwordHash)) return null;
  return { id: account.id, email: account.email, firstName: null, lastName: null, profileImageUrl: null, isAdmin: true };
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
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.[SESSION_COOKIE];
}

export function setSessionCookie(res: Response, sid: string): void {
  res.cookie(SESSION_COOKIE, sid, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL });
}