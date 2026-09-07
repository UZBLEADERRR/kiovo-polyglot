import type { RenderContext } from "../types";
import { alpha, drawImageCover, font, roundRect } from "./draw";
import { anim, easeOutCubic, outro } from "./anim";

/** Sahna ichki chekkalari — barcha shablonlar shundan foydalanadi. */
export function pad(rc: RenderContext) {
  return Math.round(rc.W * 0.083);
}

export function contentWidth(rc: RenderContext) {
  return rc.W - pad(rc) * 2;
}

/**
 * Yuqoridagi mono yozuv: "01 / THE PRESSURE TEST".
 * Reels uslubidagi "bo'lim raqami" — videoni seriya kabi ko'rsatadi.
 */
export function drawKicker(rc: RenderContext, text: string, y?: number, delay = 0) {
  const { ctx, brand, t, index } = rc;
  const raw = String(text ?? "").trim();
  if (!raw) return;
  const p = pad(rc);
  const size = Math.round(rc.u * 0.026);
  const top = y ?? Math.round(rc.H * 0.09);
  const a = anim(t, delay, 420);
  if (a <= 0.001) return;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(0, (1 - a) * -14);
  ctx.font = font(700, size, true);
  ctx.textBaseline = "middle";

  const num = String(index + 1).padStart(2, "0");
  const numText = `${num} `;
  const sepText = "/ ";
  ctx.fillStyle = brand.accent;
  ctx.fillText(numText, p, top);
  let x = p + ctx.measureText(numText).width;
  ctx.fillStyle = alpha(brand.text, 0.35);
  ctx.fillText(sepText, x, top);
  x += ctx.measureText(sepText).width;
  ctx.fillStyle = brand.accent;
  ctx.fillText(raw.toUpperCase(), x, top);
  ctx.restore();
}

/** Pastdagi brend tagi — "SCALING LAB / SYSTEM DESIGN" o'rnida sizning brend. */
export function drawWatermark(rc: RenderContext) {
  const { ctx, brand, H, t } = rc;
  if (!brand.watermark) return;
  const label = [brand.name, brand.handle].filter(Boolean).join("   /   ");
  if (!label) return;
  const p = pad(rc);
  const size = Math.round(rc.u * 0.022);
  const y = H - Math.round(H * 0.045);
  const a = anim(t, 260, 500);

  ctx.save();
  ctx.globalAlpha = a * 0.75;
  ctx.font = font(500, size, true);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  let x = p;
  const logo = brand.logoAssetId ? rc.images.get(brand.logoAssetId) : undefined;
  if (logo) {
    const s = size * 1.9;
    ctx.save();
    roundRect(ctx, x, y - s / 2, s, s, s * 0.3);
    ctx.clip();
    drawImageCover(ctx, logo, x, y - s / 2, s, s);
    ctx.restore();
    x += s + size * 0.7;
  }

  ctx.fillStyle = alpha(brand.text, 0.6);
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.restore();
}

/** Urg'u chizig'i — sarlavha ostidagi qisqa aksent. */
export function drawRule(
  rc: RenderContext,
  x: number,
  y: number,
  width: number,
  delay = 0,
  color?: string,
) {
  const { ctx, brand, t } = rc;
  const a = anim(t, delay, 520, easeOutCubic);
  if (a <= 0.001) return;
  ctx.save();
  ctx.fillStyle = color ?? brand.accent;
  ctx.fillRect(x, y, width * a, Math.max(3, rc.u * 0.0045));
  ctx.restore();
}

/**
 * Sahna oxiridagi so'nish. Keyingi sahnaga o'tish effekti bo'lsa
 * so'nish qo'llanmaydi — aks holda ikki effekt ustma-ust tushadi.
 */
export function sceneFade(rc: RenderContext, tail = 300): number {
  return rc.noOutro ? 1 : outro(rc.t, rc.dur, tail);
}
