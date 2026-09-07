import { clamp, seeded } from "./anim";

export const FONT_SANS = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const FONT_MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export function font(weight: number, size: number, mono = false) {
  return `${weight} ${size}px ${mono ? FONT_MONO : FONT_SANS}`;
}

/** #rrggbb + alpha -> rgba() */
export function alpha(color: string, a: number): string {
  const c = color.trim();
  if (c.startsWith("#")) {
    const hex = c.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((h) => h + h)
            .join("")
        : hex.slice(0, 6);
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return c;
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${clamp(a, 0, 1)})`;
  }
  if (c.startsWith("rgb(")) return c.replace("rgb(", "rgba(").replace(")", `, ${clamp(a, 0, 1)})`);
  return c;
}

export function lighten(color: string, k: number): string {
  const hex = color.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((h) => h + h).join("") : hex.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return color;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)),
  );
  return `#${ch.map((v) => clamp(v, 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Matnni maxWidth ichiga sig'adigan qatorlarga bo'ladi. */
export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  for (const paragraph of String(text ?? "").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = `${line} ${words[i]}`;
      if (ctx.measureText(next).width <= maxWidth) line = next;
      else {
        out.push(line);
        line = words[i];
      }
    }
    out.push(line);
  }
  return out;
}

export interface FitResult {
  lines: string[];
  size: number;
  lineHeight: number;
}

/**
 * Shrift o'lchamini kamaytira borib, matnni `maxWidth` x `maxLines` ichiga sig'diradi.
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: {
    maxWidth: number;
    maxLines: number;
    size: number;
    minSize?: number;
    weight?: number;
    mono?: boolean;
    lineHeightRatio?: number;
  },
): FitResult {
  const {
    maxWidth,
    maxLines,
    size,
    minSize = Math.max(14, size * 0.4),
    weight = 700,
    mono = false,
    lineHeightRatio = 1.1,
  } = opts;
  let s = size;
  let lines: string[] = [];
  for (let guard = 0; guard < 60; guard++) {
    ctx.font = font(weight, s, mono);
    lines = wrapLines(ctx, text, maxWidth);
    const tooWide = lines.some((l) => ctx.measureText(l).width > maxWidth + 0.5);
    if (lines.length <= maxLines && !tooWide) break;
    if (s <= minSize) break;
    s = Math.max(minSize, s * 0.94);
  }
  ctx.font = font(weight, s, mono);
  return { lines, size: s, lineHeight: s * lineHeightRatio };
}

/** Qator-qator matn chizadi, har biri o'z animatsiya progressi bilan. */
export function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  perLine: (i: number) => { o: number; dy: number },
) {
  for (let i = 0; i < lines.length; i++) {
    const { o, dy } = perLine(i);
    if (o <= 0.001) continue;
    ctx.globalAlpha = o;
    ctx.fillText(lines[i], x, y + i * lineHeight + dy);
  }
  ctx.globalAlpha = 1;
}

/** Rasmni ramka ichiga "cover" qilib joylash uchun manba to'rtburchagi. */
export function coverRect(
  iw: number,
  ih: number,
  w: number,
  h: number,
  zoom = 1,
  panX = 0.5,
  panY = 0.5,
) {
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  return { dw, dh, dx: (w - dw) * panX, dy: (h - dh) * panY };
}

export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  zoom = 1,
  panX = 0.5,
  panY = 0.5,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const r = coverRect(iw, ih, w, h, zoom, panX, panY);
  ctx.drawImage(img, x + r.dx, y + r.dy, r.dw, r.dh);
}

/** Ko'p ishlatiladigan "shisha" karta. */
export function glassCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke: string,
  strokeWidth = 2,
) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (strokeWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

/** Odam siluetli ikonka (statistika sahnasi uchun). */
export function personIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  const headR = size * 0.19;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.28, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  const bw = size * 0.52;
  const bh = size * 0.44;
  const by = cy - size * 0.02;
  ctx.moveTo(cx - bw / 2, by + bh);
  ctx.quadraticCurveTo(cx - bw / 2, by, cx, by);
  ctx.quadraticCurveTo(cx + bw / 2, by, cx + bw / 2, by + bh);
  ctx.closePath();
  ctx.fill();
}

/** Nuqtali shovqin — fon "tekstura"si uchun (deterministik). */
export function grain(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  count: number,
  color: string,
  seed = 1,
) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = seeded(seed + i * 2.13) * W;
    const y = seeded(seed + i * 5.71 + 9.3) * H;
    const s = 1 + seeded(seed + i * 3.3) * 2;
    ctx.fillRect(x, y, s, s);
  }
}

export function shadow(
  ctx: CanvasRenderingContext2D,
  color: string,
  blur: number,
  ox = 0,
  oy = 0,
) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = ox;
  ctx.shadowOffsetY = oy;
}

export function noShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/** 1234567 -> "1 234 567" */
export function formatNumber(n: number): string {
  const rounded = Math.round(n);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
