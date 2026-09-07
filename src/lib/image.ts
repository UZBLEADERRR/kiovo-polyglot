const MAX_DIM = 1920;
const KEEP_PNG_UNDER = 3 * 1024 * 1024;

/**
 * Telefon kamerasidan kelgan katta rasmlarni kichraytiradi.
 * Shaffoflik kerak bo'lgan kichik PNG'lar o'zgarishsiz qoladi.
 */
export async function prepareImage(file: File): Promise<Blob> {
  if (file.type === "image/png" && file.size < KEEP_PNG_UNDER) {
    const size = await probe(file);
    if (size.w <= MAX_DIM && size.h <= MAX_DIM) return file;
  }
  if (file.size < 400 * 1024) {
    const size = await probe(file);
    if (size.w <= MAX_DIM && size.h <= MAX_DIM) return file;
  }

  const bitmap = await createBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h);
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  const keepAlpha = file.type === "image/png" || file.type === "image/webp";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, keepAlpha ? "image/png" : "image/jpeg", 0.88),
  );
  return blob ?? file;
}

function probe(file: Blob): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Rasmni o'qib bo'lmadi"));
    };
    img.src = url;
  });
}

async function createBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* eski qurilmalar uchun pastdagi yo'l */
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
    img.src = url;
  });
  return img;
}
