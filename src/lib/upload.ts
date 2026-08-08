import { supabase } from "@/integrations/supabase/client";
import { db, nowIso } from "./db";

/** Downscales and re-encodes an image so QR codes and proofs stay small on mobile data. */
export async function compressImage(file: File, maxSize = 1000, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  return blob ?? file;
}

async function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function uploadImage(
  bucket: string,
  userId: string,
  file: File,
): Promise<{ path: string }> {
  const blob = await compressImage(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  await db.files.put({ path, bucket, dataUrl: await toDataUrl(blob), cachedAt: nowIso() });
  return { path };
}
