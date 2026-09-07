/**
 * Gemini rasm modeli bilan ishlash.
 *
 * So'rovlar to'g'ridan-to'g'ri foydalanuvchi qurilmasidan Google API'ga ketadi;
 * kalit faqat shu qurilmaning localStorage'ida saqlanadi va boshqa hech qayerga
 * yuborilmaydi.
 */

import { Capacitor, CapacitorHttp } from "@capacitor/core";

const KEY_STORAGE = "kiovo.gemini.apiKey";
const MODEL_STORAGE = "kiovo.gemini.model";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export const DEFAULT_MODEL = "gemini-2.5-flash-image";

/** Model nomi o'zgarib turadi — birinchisi ishlamasa keyingisi sinaladi. */
const MODEL_FALLBACKS = [DEFAULT_MODEL, "gemini-2.5-flash-image-preview"];

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setApiKey(key: string) {
  try {
    const trimmed = key.trim();
    if (trimmed) localStorage.setItem(KEY_STORAGE, trimmed);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* xotira yopiq bo'lsa jim o'tamiz */
  }
}

export function hasApiKey(): boolean {
  return getApiKey().length > 10;
}

export function getModel(): string {
  try {
    return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export function setModel(model: string) {
  try {
    const trimmed = model.trim();
    if (trimmed && trimmed !== DEFAULT_MODEL) localStorage.setItem(MODEL_STORAGE, trimmed);
    else localStorage.removeItem(MODEL_STORAGE);
  } catch {
    /* e'tiborsiz */
  }
}

export type GeminiAspect = "1:1" | "9:16" | "16:9" | "4:5" | "3:4";

export interface GenerateOptions {
  prompt: string;
  /** Tahrirlash uchun manba rasmlar (bo'sh bo'lsa noldan yaratiladi). */
  images?: Blob[];
  aspectRatio?: GeminiAspect;
  signal?: AbortSignal;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      const r = String(reader.result ?? "");
      const comma = r.indexOf(",");
      resolve(comma >= 0 ? r.slice(comma + 1) : r);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Faylni o'qib bo'lmadi"));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(data: string, mime: string): Blob {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime || "image/png" });
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string; code?: number };
}

/** Xato matnini foydalanuvchi tushunadigan tilga o'giradi. */
function friendlyError(status: number, raw: string): string {
  const text = raw.toLowerCase();
  if (status === 400 && (text.includes("api key") || text.includes("api_key"))) {
    return "API kalit noto'g'ri. Sozlamalardan kalitni tekshiring.";
  }
  if (status === 403) return "Kalitga bu modeldan foydalanishga ruxsat berilmagan.";
  if (status === 404) return "Model topilmadi. Sozlamalarda model nomini o'zgartirib ko'ring.";
  if (status === 429) return "So'rovlar chegarasi tugadi. Biroz kutib qayta urinib ko'ring.";
  if (status >= 500) return "Google serveri javob bermadi. Birozdan keyin qayta urinib ko'ring.";
  return raw || `So'rov bajarilmadi (${status}).`;
}

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function callModel(
  model: string,
  body: Record<string, unknown>,
  apiKey: string,
  signal?: AbortSignal,
): Promise<GeminiResponse> {
  const url = `${ENDPOINT}/${encodeURIComponent(model)}:generateContent`;
  const headers = { "Content-Type": "application/json", "x-goog-api-key": apiKey };

  let status: number;
  let json: GeminiResponse = {};
  let raw = "";

  if (isNative()) {
    // Androidda so'rov WebView'dan emas, mahalliy koddan ketadi —
    // shunda CORS cheklovlari umuman qo'llanmaydi.
    if (signal?.aborted) throw new DOMException("Bekor qilindi", "AbortError");
    const res = await CapacitorHttp.post({ url, headers, data: body });
    if (signal?.aborted) throw new DOMException("Bekor qilindi", "AbortError");
    status = res.status;
    if (typeof res.data === "string") {
      raw = res.data;
      try {
        json = JSON.parse(res.data) as GeminiResponse;
      } catch {
        /* xom matn */
      }
    } else if (res.data) {
      json = res.data as GeminiResponse;
      raw = "";
    }
  } else {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });
    status = res.status;
    raw = await res.text();
    try {
      json = raw ? (JSON.parse(raw) as GeminiResponse) : {};
    } catch {
      /* JSON bo'lmasa xom matn xato sifatida ishlatiladi */
    }
  }

  if (status < 200 || status >= 300) {
    const message = json.error?.message ?? raw.slice(0, 300);
    throw new GeminiError(friendlyError(status, message), status, message);
  }
  return json;
}

function firstImage(json: GeminiResponse): Blob | null {
  for (const cand of json.candidates ?? []) {
    for (const part of cand.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return base64ToBlob(part.inlineData.data, part.inlineData.mimeType);
      }
    }
  }
  return null;
}

function refusalText(json: GeminiResponse): string {
  const blocked = json.promptFeedback?.blockReason;
  if (blocked) return `So'rov rad etildi (${blocked}). Boshqacha ta'riflab ko'ring.`;
  const texts: string[] = [];
  for (const cand of json.candidates ?? []) {
    for (const part of cand.content?.parts ?? []) {
      if (part.text) texts.push(part.text);
    }
  }
  if (texts.length) return texts.join(" ").slice(0, 240);
  return "Model rasm qaytarmadi. So'rovni boshqacha yozib ko'ring.";
}

/**
 * Matn (va ixtiyoriy manba rasmlar) asosida rasm yaratadi.
 * Model nomi yoki qo'shimcha sozlamalar qabul qilinmasa, ular tashlab
 * yuborilib qayta urinib ko'riladi.
 */
export async function generateImage(opts: GenerateOptions): Promise<Blob> {
  const apiKey = getApiKey();
  if (!apiKey) throw new GeminiError("Avval Gemini API kalitini kiriting.");

  const parts: GeminiPart[] = [{ text: opts.prompt }];
  for (const img of opts.images ?? []) {
    parts.push({
      inlineData: { mimeType: img.type || "image/png", data: await blobToBase64(img) },
    });
  }

  const preferred = getModel();
  const models = [preferred, ...MODEL_FALLBACKS.filter((m) => m !== preferred)];

  const buildBody = (withImageConfig: boolean) => ({
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      ...(withImageConfig && opts.aspectRatio
        ? { imageConfig: { aspectRatio: opts.aspectRatio } }
        : {}),
    },
  });

  let lastError: GeminiError | null = null;
  for (const model of models) {
    for (const withImageConfig of opts.aspectRatio ? [true, false] : [false]) {
      try {
        const json = await callModel(model, buildBody(withImageConfig), apiKey, opts.signal);
        const blob = firstImage(json);
        if (blob) return blob;
        lastError = new GeminiError(refusalText(json));
        // Rad javobi — boshqa model ham xuddi shunday javob beradi.
        throw lastError;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") throw err;
        const gerr = err instanceof GeminiError ? err : new GeminiError(String(err));
        lastError = gerr;
        // 400 — ehtimol imageConfig qo'llab-quvvatlanmaydi; qayta urinamiz.
        // 404 — model nomi boshqa; keyingi modelga o'tamiz.
        if (gerr.status === 400 && withImageConfig) continue;
        if (gerr.status === 404) break;
        throw gerr;
      }
    }
  }
  throw lastError ?? new GeminiError("Rasm yaratilmadi.");
}

/** Kalitni tez tekshirish uchun kichik so'rov. */
export async function testApiKey(signal?: AbortSignal): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) return false;
  const url = `${ENDPOINT}?pageSize=1`;
  const headers = { "x-goog-api-key": apiKey };
  if (isNative()) {
    const res = await CapacitorHttp.get({ url, headers });
    return res.status >= 200 && res.status < 300;
  }
  const res = await fetch(url, { headers, signal });
  return res.ok;
}
