import type { AuthUser } from "@workspace/api-zod";
import { type NextFunction, type Request, type Response } from "express";
import { clearSession, getSession, getSessionId, type SessionData } from "../lib/auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }
    interface AuthedRequest { user: User }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  req.isAuthenticated = function (this: Request) { return this.user != null; } as Request["isAuthenticated"];
  const sid = getSessionId(req);
  if (!sid) return next();
  const session: SessionData | null = await getSession(sid);
  if (!session?.user?.id) {
    await clearSession(res, sid);
    return next();
  }
  req.user = session.user;
  return next();
}