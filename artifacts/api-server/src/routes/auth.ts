import { Router, type IRouter, type Request, type Response } from "express";
import { authenticateAdmin, clearSession, createSession, getSessionId, setSessionCookie } from "../lib/auth";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(GetCurrentAuthUserResponse.parse({ user: req.isAuthenticated() ? req.user : null }));
});

router.post("/auth/login", async (req: Request, res: Response) => {
  const email = typeof req.body.email === "string" ? req.body.email : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!email || !password) {
    res.status(400).json({ error: "이메일과 비밀번호를 입력해 주세요." });
    return;
  }
  const user = await authenticateAdmin(email, password);
  if (!user) {
    res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
    return;
  }
  const sid = await createSession({ user });
  setSessionCookie(res, sid);
  res.json({ user });
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  await clearSession(res, getSessionId(req));
  res.json({ success: true });
});

export default router;