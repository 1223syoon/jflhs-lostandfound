import { Router, type IRouter, type Request, type Response } from "express";
import { db, lostItemsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router: IRouter = Router();
const categories = new Set(["교복", "전자기기", "문구류", "생활용품", "기타"]);
const statuses = new Set(["보관 중", "수령 완료"]);

function adminOnly(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "로그인이 필요합니다." });
    return false;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({ error: "관리자 권한이 필요합니다." });
    return false;
  }
  return true;
}

function validBody(body: Record<string, unknown>) {
  return typeof body.itemName === "string" && body.itemName.trim().length > 0 &&
    typeof body.category === "string" && categories.has(body.category) &&
    typeof body.foundDate === "string" && body.foundDate.length > 0 &&
    typeof body.foundLocation === "string" && body.foundLocation.trim().length > 0 &&
    (body.status === undefined || (typeof body.status === "string" && statuses.has(body.status)));
}

router.get("/lost-items", async (_req, res) => {
  const items = await db.select().from(lostItemsTable).orderBy(desc(lostItemsTable.createdAt));
  res.json(items);
});

router.post("/lost-items", async (req, res) => {
  if (!adminOnly(req, res)) return;
  if (!validBody(req.body)) {
    res.status(400).json({ error: "필수 정보를 확인해 주세요." });
    return;
  }
  const [item] = await db.insert(lostItemsTable).values({
    itemName: req.body.itemName.trim(),
    category: req.body.category,
    foundDate: req.body.foundDate,
    foundLocation: req.body.foundLocation.trim(),
    description: typeof req.body.description === "string" ? req.body.description : "",
    imageUrl: typeof req.body.imageUrl === "string" ? req.body.imageUrl : null,
    status: typeof req.body.status === "string" ? req.body.status : "보관 중",
  }).returning();
  res.status(201).json(item);
});

router.patch("/lost-items/:id", async (req, res) => {
  if (!adminOnly(req, res)) return;
  if (!validBody(req.body)) {
    res.status(400).json({ error: "필수 정보를 확인해 주세요." });
    return;
  }
  const [item] = await db.update(lostItemsTable).set({
    itemName: req.body.itemName.trim(),
    category: req.body.category,
    foundDate: req.body.foundDate,
    foundLocation: req.body.foundLocation.trim(),
    description: typeof req.body.description === "string" ? req.body.description : "",
    imageUrl: typeof req.body.imageUrl === "string" ? req.body.imageUrl : null,
    status: typeof req.body.status === "string" ? req.body.status : "보관 중",
  }).where(eq(lostItemsTable.id, req.params.id)).returning();
  if (!item) { res.status(404).json({ error: "물품을 찾을 수 없습니다." }); return; }
  res.json(item);
});

router.delete("/lost-items/:id", async (req, res) => {
  if (!adminOnly(req, res)) return;
  await db.delete(lostItemsTable).where(eq(lostItemsTable.id, req.params.id));
  res.status(204).end();
});

router.post("/uploads/image", async (req, res) => {
  if (!adminOnly(req, res)) return;
  const { dataUrl } = req.body as { dataUrl?: unknown };
  if (typeof dataUrl !== "string" || !/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 5_000_000) {
    res.status(400).json({ error: "지원되는 이미지 파일을 선택해 주세요." });
    return;
  }
  res.json({ imageUrl: dataUrl });
});

export default router;