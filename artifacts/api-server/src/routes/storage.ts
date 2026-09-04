import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();
const SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

function isAdmin(req: Request, res: Response): boolean {
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

function parseStoragePath(path: string): { bucketName: string; objectName: string } {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const parts = normalized.split("/");
  if (parts.length < 3 || !parts[1] || !parts.slice(2).join("/")) {
    throw new Error("잘못된 스토리지 경로입니다.");
  }
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

async function signObjectUrl(
  bucketName: string,
  objectName: string,
  method: "GET" | "PUT" | "DELETE",
): Promise<string> {
  const response = await fetch(`${SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`스토리지 서명 URL 발급 실패: ${response.status}`);
  }
  const body = await response.json() as { signed_url?: unknown };
  if (typeof body.signed_url !== "string") {
    throw new Error("스토리지 서명 URL 응답이 올바르지 않습니다.");
  }
  return body.signed_url;
}

router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const { name, size, contentType } = req.body as {
    name?: unknown;
    size?: unknown;
    contentType?: unknown;
  };
  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    typeof size !== "number" ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > MAX_IMAGE_SIZE ||
    typeof contentType !== "string" ||
    !contentType.startsWith("image/")
  ) {
    res.status(400).json({ error: "8MB 이하의 이미지 파일만 업로드할 수 있습니다." });
    return;
  }

  try {
    const privateDir = process.env.PRIVATE_OBJECT_DIR;
    if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR가 설정되지 않았습니다.");
    const objectId = crypto.randomUUID();
    const fullPath = `${privateDir.replace(/\/$/, "")}/uploads/${objectId}`;
    const { bucketName, objectName } = parseStoragePath(fullPath);
    const uploadURL = await signObjectUrl(bucketName, objectName, "PUT");
    res.json({
      uploadURL,
      objectPath: `/objects/uploads/${objectId}`,
      metadata: { name: name.trim(), size, contentType },
    });
  } catch (error) {
    req.log.error({ err: error }, "Error generating image upload URL");
    res.status(500).json({ error: "이미지 업로드를 준비하지 못했습니다." });
  }
});

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const rawPath = req.params.path;
    const objectPath = `/objects/${Array.isArray(rawPath) ? rawPath.join("/") : rawPath}`;
    const privateDir = process.env.PRIVATE_OBJECT_DIR;
    if (!privateDir || !objectPath.startsWith("/objects/uploads/")) {
      res.status(404).json({ error: "파일을 찾을 수 없습니다." });
      return;
    }
    const entityId = objectPath.slice("/objects/".length);
    const { bucketName, objectName } = parseStoragePath(
      `${privateDir.replace(/\/$/, "")}/${entityId}`,
    );
    const downloadURL = await signObjectUrl(bucketName, objectName, "GET");
    res.redirect(302, downloadURL);
  } catch (error) {
    req.log.error({ err: error }, "Error serving stored image");
    res.status(404).json({ error: "파일을 찾을 수 없습니다." });
  }
});

router.delete("/storage/objects/*path", async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  try {
    const rawPath = req.params.path;
    const objectPath = `/objects/${Array.isArray(rawPath) ? rawPath.join("/") : rawPath}`;
    const privateDir = process.env.PRIVATE_OBJECT_DIR;
    if (!privateDir || !objectPath.startsWith("/objects/uploads/")) {
      res.status(404).json({ error: "파일을 찾을 수 없습니다." });
      return;
    }
    const entityId = objectPath.slice("/objects/".length);
    const { bucketName, objectName } = parseStoragePath(
      `${privateDir.replace(/\/$/, "")}/${entityId}`,
    );
    const deleteURL = await signObjectUrl(bucketName, objectName, "DELETE");
    const response = await fetch(deleteURL, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      throw new Error(`스토리지 삭제 실패: ${response.status}`);
    }
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Error deleting stored image");
    res.status(500).json({ error: "파일을 삭제하지 못했습니다." });
  }
});

export default router;