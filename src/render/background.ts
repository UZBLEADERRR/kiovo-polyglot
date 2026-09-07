import type { BackgroundStyle, RenderContext } from "../types";
import { alpha, grain, lighten } from "./draw";
import { clamp } from "./anim";

/**
 * Sahna foni. Sekin harakatlanadi — statik fon videoni "o'lik" ko'rsatadi.
 */
export function drawBackground(rc: RenderContext, style?: BackgroundStyle) {
  const { ctx, W, H, brand, t } = rc;
  const kind = style ?? brand.background;

  ctx.fillStyle = brand.bg;
  ctx.fillRect(0, 0, W, H);

  const drift = t / 1000;

  switch (kind) {
    case "grid":
      radialGlow(rc, W * 0.5, H * 0.34, Math.max(W, H) * 0.7, alpha(brand.accent, 0.09));
      gridLines(rc, drift);
      vignette(rc);
      break;
    case "glow":
      radialGlow(rc, W * 0.22, H * 0.22, Math.max(W, H) * 0.7, alpha(brand.accent, 0.3));
      radialGlow(rc, W * 0.85, H * 0.78, Math.max(W, H) * 0.62, alpha(brand.accent2, 0.26));
      vignette(rc);
      break;
    case "dots":
      dots(rc, drift);
      radialGlow(rc, W * 0.5, H * 0.2, Math.max(W, H) * 0.6, alpha(brand.accent, 0.12));
      vignette(rc);
      break;
    case "rings":
      rings(rc, drift);
      vignette(rc);
      break;
    case "gradient": {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, lighten(brand.bg, 0.06));
      g.addColorStop(0.5, brand.bg);
      g.addColorStop(1, alpha(brand.accent, 0.22));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      vignette(rc);
      break;
    }
    case "plain":
    default:
      break;
  }

  if (!rc.draft) {
    ctx.save();
    ctx.globalAlpha = 0.035;
    grain(ctx, W, H, 900, "#ffffff", 7);
    ctx.restore();
  }
}

function radialGlow(rc: RenderContext, x: number, y: number, r: number, color: string) {
  const { ctx } = rc;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, rc.W, rc.H);
}

function gridLines(rc: RenderContext, drift: number) {
  const { ctx, W, H, brand } = rc;
  const step = Math.round(W / 12);
  const off = (drift * 6) % step;
  ctx.strokeStyle = alpha(brand.text, 0.05);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = -step + off; x <= W + step; x += step) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, H);
  }
  for (let y = -step + off; y <= H + step; y += step) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(W, Math.round(y) + 0.5);
  }
  ctx.stroke();
}

function dots(rc: RenderContext, drift: number) {
  const { ctx, W, H, brand } = rc;
  const step = Math.round(W / 22);
  const off = (drift * 8) % step;
  ctx.fillStyle = alpha(brand.text, 0.08);
  for (let x = -step + off; x <= W + step; x += step) {
    for (let y = -step + off; y <= H + step; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function rings(rc: RenderContext, drift: number) {
  const { ctx, W, H, brand } = rc;
  const cx = W * 0.5;
  const cy = H * 0.42;
  const max = Math.hypot(W, H) * 0.62;
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const k = (i + ((drift * 0.08) % 1)) / 9;
    const r = k * max;
    ctx.strokeStyle = alpha(brand.accent, 0.16 * (1 - k));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function vignette(rc: RenderContext) {
  const { ctx, W, H } = rc;
  const g = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.25,
    W / 2,
    H / 2,
    Math.hypot(W, H) * 0.62,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${clamp(0.55)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
