import { Router, type IRouter, type Request, type Response } from "express";
import {
  authenticateAdminPin,
  clearPinLoginAttempts,
  clearSession,
  consumePinLoginAttempt,
  createSession,
  getSessionId,
  isAdminPinConfigured,
  setSessionCookie,
} from "../lib/auth";
import { GetCurrentAuthUserResponse, LoginAdminBody, LoginAdminResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(GetCurrentAuthUserResponse.parse({ user: req.isAuthenticated() ? req.user : null }));
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const parsed = LoginAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "숫자 비밀번호는 4자리 숫자여야 합니다." });
    return;
  }

  if (!isAdminPinConfigured()) {
    req.log.error("ADMIN_PIN is missing or is not a four-digit numeric value");
    res.status(503).json({ error: "관리자 PIN이 서버에 설정되지 않았습니다." });
    return;
  }

  const clientAddress = req.ip || req.socket.remoteAddress || "unknown";
  const attempt = await consumePinLoginAttempt(clientAddress);
  if (!attempt.allowed) {
    res.status(429).json({ error: "입력 횟수를 초과했습니다. 15분 후 다시 시도해 주세요." });
    return;
  }

  const user = authenticateAdminPin(parsed.data.pin);
  if (!user) {
    res.status(401).json({ error: "숫자 비밀번호가 올바르지 않습니다." });
    return;
  }

  await clearPinLoginAttempts(attempt.key);
  const sid = await createSession({ user });
  setSessionCookie(res, sid);
  res.json(LoginAdminResponse.parse({ user }));
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  await clearSession(res, getSessionId(req));
  res.json({ success: true });
});

export default router;