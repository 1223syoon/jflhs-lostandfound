import { Router, type IRouter, type Request, type Response } from "express";
import { db, lostItemsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { deleteStoredImageObject, isStoredImagePath, verifyStoredImageObject } from "./storage";

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
  if (req.body.imageUrl !== undefined && req.body.imageUrl !== null && typeof req.body.imageUrl !== "string") {
    res.status(400).json({ error: "이미지 정보 형식이 올바르지 않습니다." });
    return;
  }
  const imageUrl = typeof req.body.imageUrl === "string" ? req.body.imageUrl : null;
  if (imageUrl) {
    if (!isStoredImagePath(imageUrl)) {
      res.status(400).json({ error: "새 사진은 업로드와 저장 확인을 완료한 뒤 등록해 주세요." });
      return;
    }
    try {
      await verifyStoredImageObject(imageUrl);
    } catch (error) {
      req.log.warn({ err: error }, "Rejected unverified lost-item image");
      res.status(422).json({ error: "사진 파일이 저장되지 않았거나 유효하지 않습니다. 다시 선택해 주세요." });
      return;
    }
  }
  const [item] = await db.insert(lostItemsTable).values({
    itemName: req.body.itemName.trim(),
    category: req.body.category,
    foundDate: req.body.foundDate,
    foundLocation: req.body.foundLocation.trim(),
    description: typeof req.body.description === "string" ? req.body.description : "",
    imageUrl,
    // New records always start in storage; status changes use PATCH.
    status: "보관 중",
  }).returning();
  res.status(201).json(item);
});

router.patch("/lost-items/:id", async (req, res) => {
  if (!adminOnly(req, res)) return;
  if (!validBody(req.body)) {
    res.status(400).json({ error: "필수 정보를 확인해 주세요." });
    return;
  }
  const [existing] = await db.select().from(lostItemsTable).where(eq(lostItemsTable.id, req.params.id));
  if (!existing) {
    res.status(404).json({ error: "물품을 찾을 수 없습니다." });
    return;
  }
  const hasImageUrl = Object.prototype.hasOwnProperty.call(req.body, "imageUrl");
  if (hasImageUrl && req.body.imageUrl !== null && typeof req.body.imageUrl !== "string") {
    res.status(400).json({ error: "이미지 정보 형식이 올바르지 않습니다." });
    return;
  }
  // Omitting imageUrl means the image was not changed. This also prevents
  // legacy data URLs from being resent in large JSON edit requests.
  const imageUrl = hasImageUrl
    ? (typeof req.body.imageUrl === "string" && req.body.imageUrl.length > 0 ? req.body.imageUrl : null)
    : existing.imageUrl;
  if (imageUrl && imageUrl !== existing.imageUrl) {
    if (!isStoredImagePath(imageUrl)) {
      res.status(400).json({ error: "새 사진은 업로드와 저장 확인을 완료한 뒤 저장해 주세요." });
      return;
    }
    try {
      await verifyStoredImageObject(imageUrl);
    } catch (error) {
      req.log.warn({ err: error }, "Rejected unverified lost-item image update");
      res.status(422).json({ error: "사진 파일이 저장되지 않았거나 유효하지 않습니다. 다시 선택해 주세요." });
      return;
    }
  }
  const [item] = await db.update(lostItemsTable).set({
    itemName: req.body.itemName.trim(),
    category: req.body.category,
    foundDate: req.body.foundDate,
    foundLocation: req.body.foundLocation.trim(),
    description: typeof req.body.description === "string" ? req.body.description : "",
    imageUrl,
    status: typeof req.body.status === "string" ? req.body.status : "보관 중",
  }).where(eq(lostItemsTable.id, req.params.id)).returning();
  if (!item) { res.status(404).json({ error: "물품을 찾을 수 없습니다." }); return; }
  if (existing.imageUrl && existing.imageUrl !== imageUrl && isStoredImagePath(existing.imageUrl)) {
    try {
      await deleteStoredImageObject(existing.imageUrl);
    } catch (error) {
      req.log.error({ err: error, itemId: item.id }, "Unable to delete replaced lost-item image");
    }
  }
  res.json(item);
});

router.delete("/lost-items/:id", async (req, res) => {
  if (!adminOnly(req, res)) return;
  const [existing] = await db.select().from(lostItemsTable).where(eq(lostItemsTable.id, req.params.id));
  if (!existing) { res.status(204).end(); return; }
  await db.delete(lostItemsTable).where(eq(lostItemsTable.id, req.params.id));
  if (existing.imageUrl && isStoredImagePath(existing.imageUrl)) {
    try {
      await deleteStoredImageObject(existing.imageUrl);
    } catch (error) {
      req.log.error({ err: error, itemId: existing.id }, "Unable to delete removed lost-item image");
    }
  }
  res.status(204).end();
});

export default router;