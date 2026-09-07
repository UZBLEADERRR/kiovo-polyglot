import type { TemplateDef } from "../../types";
import { drawBackground } from "../background";
import { contentWidth, pad, sceneFade } from "../chrome";
import { alpha, drawImageCover, fitText, font, roundRect } from "../draw";
import { anim, easeOutBack, easeOutQuint } from "../anim";

/** Yakuniy kadr — logo, brend nomi va chaqiruv. */
export const outroTemplate: TemplateDef = {
  id: "outro",
  name: "Yakun / CTA",
  group: "Yakun",
  emoji: "🏁",
  defaultDurationMs: 3000,
  fields: [
    { key: "logo", label: "Logo", type: "image", help: "Bo'sh qoldirilsa brend logosi ishlatiladi." },
    { key: "title", label: "Sarlavha", type: "text", placeholder: "Brend nomi" },
    { key: "handle", label: "Username", type: "text", placeholder: "@brend" },
    { key: "cta", label: "Chaqiruv tugmasi", type: "text", placeholder: "Obuna bo'ling" },
    { key: "note", label: "Qo'shimcha izoh", type: "text" },
  ],
  defaults: {
    logo: "",
    title: "",
    handle: "",
    cta: "Obuna bo'ling",
    note: "",
  },
  draw(rc) {
    drawBackground(rc, "glow");
    const { ctx, W, H, u, brand, t, data } = rc;
    const p = pad(rc);
    const cw = contentWidth(rc);
    const fade = sceneFade(rc);

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const logoId = String(data.logo ?? "") || brand.logoAssetId || "";
    const img = logoId ? rc.images.get(logoId) : undefined;
    const s = u * 0.26;
    let y = H * 0.28;

    const pop = anim(t, 60, 700, easeOutBack);
    ctx.save();
    ctx.globalAlpha = fade * pop;
    ctx.translate(W / 2, y + s / 2);
    ctx.scale(pop, pop);

    // Pulsatsiyalanuvchi halqalar.
    for (let i = 0; i < 3; i++) {
      const rp = ((t / 1600 + i / 3) % 1);
      ctx.strokeStyle = alpha(brand.accent, 0.28 * (1 - rp));
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.55 + rp * s * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      ctx.clip();
      drawImageCover(ctx, img, -s / 2, -s / 2, s, s);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      ctx.fillStyle = alpha(brand.accent, 0.16);
      ctx.fill();
      const initials = (String(data.title ?? "") || brand.name || "K")
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0] ?? "")
        .join("")
        .toUpperCase();
      ctx.fillStyle = brand.accent;
      ctx.font = font(900, s * 0.4);
      ctx.textBaseline = "middle";
      ctx.fillText(initials || "K", 0, s * 0.02);
      ctx.textBaseline = "top";
    }
    ctx.strokeStyle = alpha(brand.accent, 0.7);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    y += s + u * 0.11;

    const title = String(data.title ?? "").trim() || brand.name;
    if (title) {
      const a = anim(t, 300, 620, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.translate(0, (1 - a) * u * 0.035);
      const fit = fitText(ctx, title, {
        maxWidth: cw,
        maxLines: 2,
        size: u * 0.105,
        weight: 900,
        lineHeightRatio: 1.12,
      });
      ctx.font = font(900, fit.size);
      ctx.fillStyle = brand.text;
      for (let i = 0; i < fit.lines.length; i++) {
        ctx.fillText(fit.lines[i], W / 2, y + i * fit.lineHeight);
      }
      y += fit.lines.length * fit.lineHeight;
      ctx.restore();
    }

    const handle = String(data.handle ?? "").trim() || brand.handle;
    if (handle) {
      const a = anim(t, 460, 560, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.font = font(500, u * 0.042, true);
      ctx.fillStyle = brand.accent;
      ctx.fillText(handle, W / 2, y + u * 0.03);
      ctx.restore();
      y += u * 0.1;
    }

    const cta = String(data.cta ?? "").trim();
    if (cta) {
      const a = anim(t, 640, 620, easeOutBack);
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.font = font(700, u * 0.046);
      const tw = ctx.measureText(cta).width;
      const bw = tw + u * 0.13;
      const bh = u * 0.13;
      const bx = (W - bw) / 2;
      const by = y + u * 0.04;
      const pulse = 1 + Math.sin(t / 420) * 0.015;
      ctx.translate(W / 2, by + bh / 2);
      ctx.scale(pulse * a, pulse * a);
      ctx.translate(-W / 2, -(by + bh / 2));
      roundRect(ctx, bx, by, bw, bh, bh / 2);
      ctx.fillStyle = brand.accent;
      ctx.fill();
      ctx.fillStyle = brand.bg;
      ctx.textBaseline = "middle";
      ctx.fillText(cta, W / 2, by + bh / 2 + 1);
      ctx.textBaseline = "top";
      ctx.restore();
      y += u * 0.2;
    }

    const note = String(data.note ?? "").trim();
    if (note) {
      const a = anim(t, 840, 520, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * a * 0.8;
      ctx.font = font(500, u * 0.03, true);
      ctx.fillStyle = brand.muted;
      ctx.fillText(note.toUpperCase(), W / 2, Math.min(y + u * 0.02, H - p));
      ctx.restore();
    }

    ctx.restore();
  },
};
