import type { TemplateDef } from "../../types";
import { drawBackground } from "../background";
import { contentWidth, drawKicker, drawWatermark, pad, sceneFade } from "../chrome";
import { alpha, fitText, font, glassCard } from "../draw";
import { anim, clamp, easeOutBack, easeOutQuint, mix } from "../anim";
import { drawRichLine, fitRich } from "../richtext";

/**
 * Foni olib tashlangan obyekt uchun sahna: rasm brend foni ustida
 * "suzib" turadi. Gemini yaratgan yoki fonsiz qilingan rasmlar uchun.
 */
export const cutoutTemplate: TemplateDef = {
  id: "cutout",
  name: "Fonsiz obyekt",
  group: "Media",
  emoji: "✂️",
  defaultDurationMs: 4000,
  fields: [
    { key: "image", label: "Rasm (fonsiz)", type: "image", help: "Rasm tanlash oynasidagi «Fonni olib tashlash» tugmasidan foydalaning." },
    { key: "kicker", label: "Bo'lim yozuvi", type: "text" },
    { key: "headline", label: "Sarlavha", type: "textarea" },
    { key: "caption", label: "Pastdagi izoh", type: "text" },
    {
      key: "effect",
      label: "Harakat",
      type: "select",
      options: [
        { value: "float", label: "Suzish" },
        { value: "pop", label: "Otilib chiqish" },
        { value: "slide", label: "Yondan kirish" },
        { value: "spin", label: "Aylanib kirish" },
      ],
    },
    { key: "glow", label: "Orqa fonda yorug'lik", type: "toggle" },
    { key: "shadow", label: "Pastda soya", type: "toggle" },
    { key: "size", label: "Kattaligi (%)", type: "number", min: 40, max: 130, step: 5 },
  ],
  defaults: {
    image: "",
    kicker: "YANGI",
    headline: "Mana *shu* mahsulot",
    caption: "",
    effect: "float",
    glow: true,
    shadow: true,
    size: 92,
  },
  draw(rc) {
    drawBackground(rc);
    const { ctx, W, H, brand, t, data } = rc;
    const p = pad(rc);
    const cw = contentWidth(rc);
    const fade = sceneFade(rc);
    const effect = String(data.effect ?? "float");

    drawKicker(rc, String(data.kicker ?? ""), undefined, 60);

    // --- Sarlavha ---
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const head = fitRich(ctx, String(data.headline ?? ""), {
      maxWidth: cw,
      maxLines: 3,
      size: W * 0.085,
      weight: 900,
      lineHeightRatio: 1.1,
    });
    const headTop = H * 0.16;
    ctx.font = font(900, head.size);
    for (let i = 0; i < head.lines.length; i++) {
      const a = anim(t, 140 + i * 95, 600, easeOutQuint);
      if (a <= 0.001) continue;
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.translate(0, (1 - a) * W * 0.035);
      drawRichLine(ctx, head.lines[i], p, headTop + i * head.lineHeight, brand.text, brand.accent);
      ctx.restore();
    }
    const headBottom = headTop + head.lines.length * head.lineHeight;
    ctx.restore();

    // --- Obyekt ---
    const img = data.image ? rc.images.get(String(data.image)) : undefined;
    const boxTop = headBottom + W * 0.06;
    const boxBottom = H * 0.86;
    const boxH = Math.max(W * 0.3, boxBottom - boxTop);
    const cx = W / 2;
    const cy = boxTop + boxH / 2;
    const scaleUser = clamp(Number(data.size ?? 100) / 100, 0.4, 1.3);

    if (data.glow) {
      const ga = anim(t, 60, 900);
      const r = Math.min(cw, boxH) * 0.92;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, alpha(brand.accent, 0.34 * ga));
      g.addColorStop(0.55, alpha(brand.accent, 0.12 * ga));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    }

    if (img && img.naturalWidth) {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      // "Contain": obyekt to'liq ko'rinishi kerak, kesilmasligi kerak.
      const fitScale = Math.min((cw * scaleUser) / iw, (boxH * scaleUser) / ih);
      const dw = iw * fitScale;
      const dh = ih * fitScale;

      // Harakat parametrlari.
      const enter = anim(t, 180, 820, effect === "pop" ? easeOutBack : easeOutQuint);
      const bob = Math.sin(t / 900) * W * 0.012;
      const tilt = Math.sin(t / 1400) * 0.018;
      let scale = 1;
      let dx = 0;
      let dy = bob;
      let rot = tilt;

      if (effect === "pop") {
        scale = mix(0.62, 1, enter);
        dy = bob + (1 - enter) * W * 0.06;
      } else if (effect === "slide") {
        dx = (1 - enter) * -W * 0.55;
        dy = bob;
      } else if (effect === "spin") {
        scale = mix(0.7, 1, enter);
        rot = tilt + (1 - enter) * -0.35;
      } else {
        scale = mix(0.94, 1, enter);
        dy = bob + (1 - enter) * W * 0.03;
      }

      if (data.shadow) {
        const sa = anim(t, 320, 700);
        ctx.save();
        ctx.globalAlpha = fade * sa * 0.4;
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.beginPath();
        ctx.ellipse(
          cx + dx * 0.4,
          cy + dh / 2 + W * 0.03,
          (dw / 2) * 0.62 * scale,
          W * 0.022,
          0,
          0,
          Math.PI * 2,
        );
        ctx.filter = "blur(6px)";
        ctx.fill();
        ctx.filter = "none";
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = fade * clamp(enter * 1.2);
      ctx.translate(cx + dx, cy + dy);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = fade * 0.55;
      ctx.setLineDash([16, 14]);
      glassCard(
        ctx,
        p,
        cy - boxH * 0.32,
        cw,
        boxH * 0.64,
        W * 0.045,
        alpha(brand.surface, 0.4),
        alpha(brand.muted, 0.6),
        3,
      );
      ctx.setLineDash([]);
      ctx.fillStyle = brand.muted;
      ctx.font = font(500, W * 0.034, true);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("FONSIZ RASM TANLANMAGAN", W / 2, cy);
      ctx.restore();
    }

    // --- Izoh ---
    const caption = String(data.caption ?? "").trim();
    if (caption) {
      const ca = anim(t, 620, 560, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * ca;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const cap = fitText(ctx, caption, {
        maxWidth: cw,
        maxLines: 2,
        size: W * 0.042,
        weight: 500,
        lineHeightRatio: 1.25,
      });
      ctx.font = font(500, cap.size);
      ctx.fillStyle = brand.muted;
      for (let i = 0; i < cap.lines.length; i++) {
        ctx.fillText(cap.lines[i], p, H * 0.88 + i * cap.lineHeight);
      }
      ctx.restore();
    }

    drawWatermark(rc);
  },
};
