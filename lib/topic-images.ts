import { supabase } from "./supabase";

// 主題討論留言附圖：存在 Supabase Storage 的公開 bucket（建立方式見 sql/topic-images.sql）
const BUCKET = "topic-images";
export const MAX_IMAGES_PER_POST = 4;
// 縮圖後仍超過這個大小就擋下（bucket 端另有 5MB 上限）
const MAX_BYTES = 5 * 1024 * 1024;
// 手機照片動輒 4000px、好幾 MB，上傳前把長邊縮到這個尺寸
const MAX_SIDE = 1920;

export interface PendingImage {
  id: string;
  file: File;
  preview: string; // URL.createObjectURL，移除或送出後要 revoke
}

export function toPendingImages(files: File[]): PendingImage[] {
  return files
    .filter((f) => f.type.startsWith("image/"))
    .map((file) => ({ id: Math.random().toString(36).slice(2), file, preview: URL.createObjectURL(file) }));
}

export function revokePending(images: PendingImage[]): void {
  for (const img of images) URL.revokeObjectURL(img.preview);
}

// 太大的圖縮成 JPEG；GIF（可能是動圖）和本來就夠小的圖原樣上傳
async function shrink(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 1024 * 1024) { bitmap.close(); return file; }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // 透明背景的 PNG 轉 JPEG 時不要變黑底
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("圖片轉檔失敗"))), "image/jpeg", 0.85));
}

// 上傳一張圖，回傳公開網址
async function uploadOne(topicId: string, file: File): Promise<string> {
  const blob = await shrink(file);
  if (blob.size > MAX_BYTES) throw new Error("圖片太大（上限 5MB）");
  const ext = blob.type === "image/jpeg" ? "jpg" : (blob.type.split("/")[1] || "png");
  const path = `${topicId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type });
  if (error) { console.error("[topic-images.upload]", error); throw error; }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadTopicImages(topicId: string, images: PendingImage[]): Promise<string[]> {
  return Promise.all(images.map((img) => uploadOne(topicId, img.file)));
}
