/**
 * Rasm fonini olib tashlash — brauzerning o'zida, internetsiz.
 *
 * Ishlash tartibi: chekkalardan fon rangi aniqlanadi, o'sha rangdan
 * "to'kish" (flood fill) usulida fon bo'yalib, alfa kanali nolga tushiriladi,
 * so'ng chekkalar yumshatilib obyekt atrofi kesib olinadi.
 * Bir xil (tekis) fonli rasmlarda — jumladan Gemini yaratgan rasmlarda —
 * juda yaxshi natija beradi.
 */

const MAX_SIDE = 1600;

export interface CutoutOptions {
  /** Fon rangidan qanchalik farq qilgan piksel ham fon deb hisoblanadi (0–120). */
  tolerance?: number;
  /** Chekkalarni yumshatish radiusi, piksel. */
  feather?: number;
  /** Obyekt chekkasidan necha piksel qirqilsin (fon rangi "hoshiyasi" qolmasligi uchun). */
  erode?: number;
  /** Obyekt atrofidagi bo'sh joyni kesib tashlash. */
  trim?: boolean;
}

async function toCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
      img.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Kanvas mavjud emas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Chekka piksellar orasidan eng ko'p uchraydigan rangni topadi. */
function borderKeyColor(data: Uint8ClampedArray, w: number, h: number) {
  const counts = new Map<number, number>();
  const push = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (data[i + 3] < 8) return;
    // Rangni 32 pog'onaga bo'lib guruhlaymiz.
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  let best = -1;
  let bestCount = 0;
  for (const [key, n] of counts) {
    if (n > bestCount) {
      bestCount = n;
      best = key;
    }
  }
  if (best < 0) return { r: 255, g: 255, b: 255, share: 0 };
  const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
  return {
    r: ((best >> 10) & 31) * 8 + 4,
    g: ((best >> 5) & 31) * 8 + 4,
    b: (best & 31) * 8 + 4,
    share: bestCount / total,
  };
}

/** Rasmda allaqachon shaffof qismlar bormi. */
function alphaShare(data: Uint8ClampedArray): number {
  let clear = 0;
  const step = 4 * 17;
  let seen = 0;
  for (let i = 3; i < data.length; i += step) {
    seen++;
    if (data[i] < 16) clear++;
  }
  return seen ? clear / seen : 0;
}

/** Alfa kanalini yumshatadi (faqat chekkalar o'zgaradi). */
function featherAlpha(alpha: Uint8Array, w: number, h: number, radius: number) {
  if (radius < 1) return alpha;
  const tmp = new Uint8Array(alpha.length);
  const out = new Uint8Array(alpha.length);
  const r = Math.round(radius);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += alpha[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / (2 * r + 1);
      const add = alpha[y * w + Math.min(w - 1, x + r + 1)];
      const sub = alpha[y * w + Math.max(0, x - r)];
      sum += add - sub;
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / (2 * r + 1);
      const add = tmp[Math.min(h - 1, y + r + 1) * w + x];
      const sub = tmp[Math.max(0, y - r) * w + x];
      sum += add - sub;
    }
  }
  return out;
}

function trimToContent(canvas: HTMLCanvasElement, pad = 2): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return canvas;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  if (cw === w && ch === h) return canvas;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")?.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return out;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Rasm yaratilmadi"))), "image/png");
  });
}

/**
 * Fonni olib tashlab, shaffof PNG qaytaradi.
 * Rasm allaqachon shaffof bo'lsa faqat chekkalari kesiladi.
 */
export async function removeBackground(blob: Blob, opts: CutoutOptions = {}): Promise<Blob> {
  const tolerance = Math.max(4, Math.min(120, opts.tolerance ?? 34));
  const feather = opts.feather ?? 1.4;
  const erode = Math.max(0, Math.min(4, opts.erode ?? 2));
  const trim = opts.trim ?? true;

  const canvas = await toCanvas(blob);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Kanvas mavjud emas");
  const w = canvas.width;
  const h = canvas.height;
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;

  if (alphaShare(data) > 0.02) {
    return canvasToBlob(trim ? trimToContent(canvas) : canvas);
  }

  const key = borderKeyColor(data, w, h);
  const tol2 = tolerance * tolerance * 3;

  // Chekkalardan boshlab bir xil rangdagi sohani belgilaymiz.
  const mask = new Uint8Array(w * h); // 1 = fon
  const stack = new Int32Array(w * h);
  let top = 0;
  const consider = (idx: number) => {
    if (mask[idx]) return;
    const i = idx * 4;
    const dr = data[i] - key.r;
    const dg = data[i + 1] - key.g;
    const db = data[i + 2] - key.b;
    if (dr * dr + dg * dg + db * db <= tol2) {
      mask[idx] = 1;
      stack[top++] = idx;
    }
  };
  for (let x = 0; x < w; x++) {
    consider(x);
    consider((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    consider(y * w);
    consider(y * w + w - 1);
  }
  while (top > 0) {
    const idx = stack[--top];
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) consider(idx - 1);
    if (x < w - 1) consider(idx + 1);
    if (y > 0) consider(idx - w);
    if (y < h - 1) consider(idx + w);
  }

  // Fon deyarli topilmasa (rang xilma-xil) rasmni o'zgartirmaymiz.
  let bgCount = 0;
  for (let i = 0; i < mask.length; i++) bgCount += mask[i];
  if (bgCount < mask.length * 0.02) {
    return canvasToBlob(canvas);
  }

  // Fon sohasini bir necha piksel kengaytiramiz — aks holda obyekt atrofida
  // fon rangining ingichka "hoshiyasi" qolib ketadi.
  for (let step = 0; step < erode; step++) {
    const grown = mask.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (mask[idx]) continue;
        if (
          (x > 0 && mask[idx - 1]) ||
          (x < w - 1 && mask[idx + 1]) ||
          (y > 0 && mask[idx - w]) ||
          (y < h - 1 && mask[idx + w])
        ) {
          grown[idx] = 1;
        }
      }
    }
    mask.set(grown);
  }

  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) alpha[i] = mask[i] ? 0 : 255;
  const soft = featherAlpha(alpha, w, h, feather);

  for (let i = 0; i < mask.length; i++) {
    const a = soft[i];
    const p = i * 4;
    data[p + 3] = a;
    if (a > 0 && a < 250) {
      // Chekkadagi yarim shaffof piksellardan fon rangini "yechamiz".
      const k = a / 255;
      data[p] = Math.max(0, Math.min(255, (data[p] - key.r * (1 - k)) / k));
      data[p + 1] = Math.max(0, Math.min(255, (data[p + 1] - key.g * (1 - k)) / k));
      data[p + 2] = Math.max(0, Math.min(255, (data[p + 2] - key.b * (1 - k)) / k));
    }
  }
  ctx.putImageData(image, 0, 0);

  return canvasToBlob(trim ? trimToContent(canvas) : canvas);
}

/** Gemini'dan tekis fonli rasm so'rash uchun tayyor ko'rsatma. */
export const CUTOUT_PROMPT_SUFFIX =
  " Place the subject alone on a completely flat, uniform pure magenta (#FF00FF) background. " +
  "No shadows, no gradient, no reflections, no extra objects. The subject must not contain magenta.";
