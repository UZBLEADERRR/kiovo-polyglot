import { getAsset } from "./db";

interface CacheEntry {
  url: string;
  img: HTMLImageElement;
}

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

/** Rasmni IndexedDB'dan yuklab, dekod qilingan holda keshlaydi. */
export function loadImage(id: string): Promise<HTMLImageElement | null> {
  if (!id) return Promise.resolve(null);
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit.img);
  const inflight = pending.get(id);
  if (inflight) return inflight;

  const p = (async () => {
    const rec = await getAsset(id);
    if (!rec) return null;
    const url = URL.createObjectURL(rec.blob);
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("rasm yuklanmadi"));
      img.src = url;
    });
    if (typeof img.decode === "function") {
      await img.decode().catch(() => undefined);
    }
    cache.set(id, { url, img });
    return img;
  })();

  pending.set(id, p);
  p.finally(() => pending.delete(id));
  return p.catch(() => null);
}

export async function loadImages(ids: string[]): Promise<Map<string, HTMLImageElement>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, HTMLImageElement>();
  await Promise.all(
    unique.map(async (id) => {
      const img = await loadImage(id);
      if (img) out.set(id, img);
    }),
  );
  return out;
}

export function forgetImage(id: string) {
  const hit = cache.get(id);
  if (hit) {
    URL.revokeObjectURL(hit.url);
    cache.delete(id);
  }
}

/** Rasmni oldindan ko'rsatish uchun blob URL (UI kartalari uchun). */
export async function previewUrl(id: string): Promise<string | null> {
  const img = await loadImage(id);
  return img ? img.src : null;
}
