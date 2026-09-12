import { randomUUID } from "node:crypto";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "audio/webm", "audio/mpeg", "audio/wav"]);

export function validateUpload(file: File) {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new Error("File must be between 1 byte and 10 MB.");
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) throw new Error("Unsupported file type.");
}

export function assetPath(userId: string, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${userId}/${randomUUID()}.${extension}`;
}
