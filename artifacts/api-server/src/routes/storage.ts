import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import sharp from "sharp";

const router: IRouter = Router();
const SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 80_000_000;
const MAX_IMAGE_DIMENSION = 2000;
const ALLOWED_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

class ImageValidationError extends Error {}

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

export function isStoredImagePath(path: string): boolean {
  return /^\/objects\/uploads\/[0-9a-f-]{36}$/i.test(path);
}

function getObjectLocation(objectPath: string): { bucketName: string; objectName: string } {
  if (!isStoredImagePath(objectPath)) {
    throw new ImageValidationError("이미지 경로가 올바르지 않습니다.");
  }
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR가 설정되지 않았습니다.");
  return parseStoragePath(
    `${privateDir.replace(/\/$/, "")}/${objectPath.slice("/objects/".length)}`,
  );
}

async function readStoredObject(objectPath: string): Promise<Buffer> {
  const { bucketName, objectName } = getObjectLocation(objectPath);
  const downloadURL = await signObjectUrl(bucketName, objectName, "GET");
  const response = await fetch(downloadURL, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok || !response.body) {
    throw new Error(`스토리지 이미지 읽기 실패: ${response.status}`);
  }

  const advertisedSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(advertisedSize) && advertisedSize > MAX_IMAGE_SIZE) {
    await response.body.cancel();
    throw new ImageValidationError("업로드된 이미지가 8MB 제한을 초과합니다.");
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalSize = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalSize += value.byteLength;
    if (totalSize > MAX_IMAGE_SIZE) {
      await reader.cancel();
      throw new ImageValidationError("업로드된 이미지가 8MB 제한을 초과합니다.");
    }
    chunks.push(Buffer.from(value));
  }
  if (totalSize === 0) throw new ImageValidationError("빈 이미지 파일은 사용할 수 없습니다.");
  return Buffer.concat(chunks, totalSize);
}

async function inspectImage(buffer: Buffer) {
  const metadata = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: "error" })
    .metadata()
    .catch(() => {
      throw new ImageValidationError("파일이 손상됐거나 이미지 크기 제한을 초과했습니다.");
    });
  if (!["jpeg", "png", "webp"].includes(metadata.format || "")) {
    throw new ImageValidationError("JPEG, PNG, WebP 이미지 파일만 업로드할 수 있습니다.");
  }
  if (!metadata.width || !metadata.height) {
    throw new ImageValidationError("이미지 크기를 확인할 수 없습니다.");
  }
  if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
    throw new ImageValidationError("이미지 해상도가 너무 큽니다. 8천만 픽셀 이하의 사진을 선택해 주세요.");
  }
  return metadata;
}

async function normalizeImage(buffer: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  await inspectImage(buffer);
  for (const [maxDimension, quality] of [[2000, 88], [1800, 84], [1600, 80]] as const) {
    let normalized: Buffer;
    try {
      normalized = await sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: "error" })
        .rotate()
        .flatten({ background: "#ffffff" })
        .resize({
          width: maxDimension,
          height: maxDimension,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    } catch {
      throw new ImageValidationError("파일이 손상됐거나 이미지 크기 제한을 초과했습니다.");
    }
    if (normalized.byteLength <= MAX_IMAGE_SIZE) {
      const metadata = await sharp(normalized).metadata();
      if (!metadata.width || !metadata.height || metadata.format !== "jpeg") {
        throw new ImageValidationError("변환된 이미지를 확인하지 못했습니다.");
      }
      return { buffer: normalized, width: metadata.width, height: metadata.height };
    }
  }
  throw new ImageValidationError("압축 후에도 이미지가 8MB를 초과합니다. 다른 사진을 선택해 주세요.");
}

async function writeStoredObject(objectPath: string, buffer: Buffer): Promise<void> {
  const { bucketName, objectName } = getObjectLocation(objectPath);
  const uploadURL = await signObjectUrl(bucketName, objectName, "PUT");
  const response = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: buffer,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`정규화된 이미지 저장 실패: ${response.status}`);
  }
}

export async function verifyStoredImageObject(objectPath: string): Promise<void> {
  const storedImage = await readStoredObject(objectPath);
  const metadata = await inspectImage(storedImage);
  if (metadata.format !== "jpeg") {
    throw new ImageValidationError("서버에서 확인된 JPEG 이미지만 분실물에 연결할 수 있습니다.");
  }
  if (Math.max(metadata.width || 0, metadata.height || 0) > MAX_IMAGE_DIMENSION) {
    throw new ImageValidationError("이미지를 저장하기 전에 서버에서 크기와 방향 확인을 완료해 주세요.");
  }
  if (metadata.orientation && metadata.orientation !== 1) {
    throw new ImageValidationError("이미지 방향을 정리한 뒤 다시 업로드해 주세요.");
  }
}

export async function deleteStoredImageObject(objectPath: string): Promise<void> {
  if (!isStoredImagePath(objectPath)) return;
  const { bucketName, objectName } = getObjectLocation(objectPath);
  const deleteURL = await signObjectUrl(bucketName, objectName, "DELETE");
  const response = await fetch(deleteURL, { method: "DELETE", signal: AbortSignal.timeout(30_000) });
  if (!response.ok && response.status !== 404) {
    throw new Error(`스토리지 삭제 실패: ${response.status}`);
  }
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
    name.length > 255 ||
    typeof size !== "number" ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > MAX_IMAGE_SIZE ||
    typeof contentType !== "string" ||
    !ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)
  ) {
    res.status(400).json({
      error: "JPEG, PNG, WebP 이미지 파일만 업로드할 수 있습니다. 저장할 파일은 8MB 이하여야 합니다.",
    });
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

router.post("/storage/uploads/confirm", async (req: Request, res: Response) => {
  if (!isAdmin(req, res)) return;
  const objectPath = req.body?.objectPath;
  if (typeof objectPath !== "string" || !isStoredImagePath(objectPath)) {
    res.status(400).json({ error: "이미지 업로드 경로가 올바르지 않습니다." });
    return;
  }

  try {
    const original = await readStoredObject(objectPath);
    const normalized = await normalizeImage(original);
    await writeStoredObject(objectPath, normalized.buffer);

    // Read the final object back before accepting its path for database storage.
    const persisted = await readStoredObject(objectPath);
    const persistedMetadata = await inspectImage(persisted);
    if (
      persistedMetadata.format !== "jpeg" ||
      persistedMetadata.width !== normalized.width ||
      persistedMetadata.height !== normalized.height
    ) {
      throw new Error("저장 후 이미지 확인 결과가 일치하지 않습니다.");
    }

    res.json({
      objectPath,
      contentType: "image/jpeg",
      size: persisted.byteLength,
      width: normalized.width,
      height: normalized.height,
    });
  } catch (error) {
    try {
      await deleteStoredImageObject(objectPath);
    } catch (cleanupError) {
      req.log.error({ err: cleanupError }, "Failed to clean up rejected image upload");
    }
    if (error instanceof ImageValidationError) {
      res.status(422).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Error verifying image upload");
    res.status(502).json({ error: "이미지를 저장한 뒤 다시 확인하지 못했습니다. 사진을 다시 선택해 주세요." });
  }
});

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const rawPath = req.params.path;
    const objectPath = `/objects/${Array.isArray(rawPath) ? rawPath.join("/") : rawPath}`;
    if (!isStoredImagePath(objectPath)) {
      res.status(404).json({ error: "파일을 찾을 수 없습니다." });
      return;
    }
    const { bucketName, objectName } = getObjectLocation(objectPath);
    const downloadURL = await signObjectUrl(bucketName, objectName, "GET");
    res.setHeader("Cache-Control", "public, max-age=300");
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
    if (!isStoredImagePath(objectPath)) {
      res.status(404).json({ error: "파일을 찾을 수 없습니다." });
      return;
    }
    await deleteStoredImageObject(objectPath);
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Error deleting stored image");
    res.status(500).json({ error: "파일을 삭제하지 못했습니다." });
  }
});

export default router;