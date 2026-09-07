import type { TemplateDef } from "../../types";
import { drawBackground } from "../background";
import { contentWidth, drawKicker, drawWatermark, pad , sceneFade } from "../chrome";
import { alpha, fitText, font, formatNumber, glassCard, personIcon, roundRect } from "../draw";
import { anim, clamp, easeOutBack, easeOutExpo, easeOutQuint } from "../anim";
import { fitRich, drawRichLine } from "../richtext";

/** "value" maydonidan raqam ajratib olish (masalan "836964" yoki "1.2"). */
function num(v: unknown, fallback = 0): number {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

/** "Nom: 42" ko'rinishidagi qatorlarni ajratadi. */
function parsePairs(items: unknown): { label: string; value: number }[] {
  const arr = Array.isArray(items) ? items : [];
  return arr
    .map(String)
    .filter((s) => s.trim())
    .map((s) => {
      const i = s.lastIndexOf(":");
      if (i < 0) return { label: s.trim(), value: 0 };
      return { label: s.slice(0, i).trim(), value: num(s.slice(i + 1)) };
    });
}

/** Katta raqam + sanoqchi animatsiya. */
export const statTemplate: TemplateDef = {
  id: "stat",
  name: "Statistika",
  group: "Ma'lumot",
  emoji: "📈",
  defaultDurationMs: 3800,
  fields: [
    { key: "kicker", label: "Bo'lim yozuvi", type: "text" },
    { key: "title", label: "Yuqoridagi matn", type: "text" },
    { key: "value", label: "Raqam", type: "text", placeholder: "836964" },
    { key: "prefix", label: "Oldidagi belgi", type: "text", placeholder: "$" },
    { key: "suffix", label: "Ortidagi belgi", type: "text", placeholder: "+" },
    { key: "label", label: "Raqam izohi", type: "text", placeholder: "foydalanuvchi" },
    { key: "icons", label: "Odam ikonkalari", type: "toggle" },
    { key: "fill", label: "To'ldirilgan ulush (%)", type: "number", min: 0, max: 100, step: 5 },
  ],
  defaults: {
    kicker: "O'SISH",
    title: "Oyiga",
    value: "836964",
    prefix: "",
    suffix: "",
    label: "foydalanuvchi",
    icons: true,
    fill: 25,
  },
  draw(rc) {
    drawBackground(rc);
    const { ctx, H, u, brand, t, dur, data } = rc;
    const p = pad(rc);
    const cw = contentWidth(rc);
    const fade = sceneFade(rc);

    drawKicker(rc, String(data.kicker ?? ""), undefined, 40);

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    let y = H * 0.26;
    const title = String(data.title ?? "").trim();
    if (title) {
      const ta = anim(t, 120, 520, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * ta;
      ctx.translate(0, (1 - ta) * u * 0.03);
      ctx.font = font(500, u * 0.048);
      ctx.fillStyle = brand.muted;
      ctx.fillText(title, p, y);
      ctx.restore();
      y += u * 0.085;
    }

    // Sanoqchi: 0 dan qiymatgacha.
    const target = num(data.value);
    const counterP = anim(t, 260, Math.min(1600, dur * 0.55), easeOutExpo);
    const shown = target * counterP;
    const prefix = String(data.prefix ?? "");
    const suffix = String(data.suffix ?? "");
    const text = `${prefix}${formatNumber(shown)}${suffix}`;

    const big = fitText(ctx, text, {
      maxWidth: cw,
      maxLines: 1,
      size: u * 0.19,
      weight: 900,
      minSize: u * 0.09,
    });
    const pop = anim(t, 220, 520, easeOutBack);
    ctx.save();
    ctx.globalAlpha = fade * clamp(pop);
    ctx.translate(p, y);
    ctx.scale(0.9 + 0.1 * clamp(pop), 0.9 + 0.1 * clamp(pop));
    ctx.font = font(900, big.size);
    ctx.fillStyle = brand.accent;
    ctx.fillText(big.lines[0] ?? text, 0, 0);
    ctx.restore();
    y += big.size * 1.12;

    const label = String(data.label ?? "").trim();
    if (label) {
      const la = anim(t, 520, 520, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * la;
      ctx.font = font(500, u * 0.042, true);
      ctx.fillStyle = alpha(brand.text, 0.7);
      ctx.fillText(label.toUpperCase(), p, y);
      ctx.restore();
      y += u * 0.09;
    }

    if (data.icons) {
      const cols = 8;
      const gapX = cw / cols;
      const size = gapX * 0.95;
      const rowY = y + u * 0.06;
      const fillRatio = clamp(num(data.fill, 25) / 100, 0, 1);
      for (let i = 0; i < cols; i++) {
        const a = anim(t, 640 + i * 70, 460, easeOutBack);
        if (a <= 0.001) continue;
        const filled = i / cols < fillRatio;
        ctx.save();
        ctx.globalAlpha = fade * a;
        ctx.translate(p + gapX * i + gapX / 2, rowY);
        ctx.scale(a, a);
        personIcon(ctx, 0, 0, size, filled ? brand.accent : alpha(brand.accent2, 0.85));
        ctx.restore();
      }
    }

    ctx.restore();
    drawWatermark(rc);
  },
};

/** Ustunli diagramma — brend ko'rsatkichlari uchun. */
export const chartTemplate: TemplateDef = {
  id: "chart",
  name: "Diagramma",
  group: "Ma'lumot",
  emoji: "📊",
  defaultDurationMs: 4600,
  fields: [
    { key: "kicker", label: "Bo'lim yozuvi", type: "text" },
    { key: "title", label: "Sarlavha", type: "text" },
    {
      key: "series",
      label: "Ustunlar",
      type: "list",
      maxItems: 6,
      help: "Har bir qator: «Nom: son». Masalan «Yanvar: 120»",
    },
    { key: "unit", label: "O'lchov birligi", type: "text", placeholder: "ta" },
  ],
  defaults: {
    kicker: "NATIJA",
    title: "Oylik o'sish",
    series: ["Yanvar: 120", "Fevral: 260", "Mart: 410", "Aprel: 780"],
    unit: "",
  },
  draw(rc) {
    drawBackground(rc);
    const { ctx, H, u, brand, t, data } = rc;
    const p = pad(rc);
    const cw = contentWidth(rc);
    const fade = sceneFade(rc);
    const pairs = parsePairs(data.series).slice(0, 6);
    const unit = String(data.unit ?? "").trim();

    drawKicker(rc, String(data.kicker ?? ""), undefined, 40);

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const title = fitRich(ctx, String(data.title ?? ""), {
      maxWidth: cw,
      maxLines: 2,
      size: u * 0.08,
      weight: 900,
    });
    let y = H * 0.2;
    ctx.font = font(900, title.size);
    for (let i = 0; i < title.lines.length; i++) {
      const a = anim(t, 120 + i * 80, 540, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.translate(0, (1 - a) * u * 0.03);
      drawRichLine(ctx, title.lines[i], p, y + i * title.lineHeight, brand.text, brand.accent);
      ctx.restore();
    }
    y += title.lines.length * title.lineHeight + u * 0.07;

    if (!pairs.length) {
      ctx.restore();
      drawWatermark(rc);
      return;
    }

    const max = Math.max(...pairs.map((s) => s.value), 1);
    const chartH = Math.min(H * 0.4, H * 0.86 - y);
    const gap = cw * 0.045;
    const barW = (cw - gap * (pairs.length - 1)) / pairs.length;
    const baseY = y + chartH;

    // Asos chizig'i.
    ctx.save();
    ctx.globalAlpha = fade * 0.2;
    ctx.strokeStyle = brand.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p, baseY);
    ctx.lineTo(p + cw, baseY);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < pairs.length; i++) {
      const delay = 360 + i * 160;
      const a = anim(t, delay, 760, easeOutExpo);
      if (a <= 0.001) continue;
      const s = pairs[i];
      const h = (s.value / max) * (chartH - u * 0.1) * a;
      const x = p + i * (barW + gap);
      const top = baseY - h;
      const isLast = i === pairs.length - 1;
      const color = isLast ? brand.accent : alpha(brand.accent2, 0.9);

      const g = ctx.createLinearGradient(0, top, 0, baseY);
      g.addColorStop(0, color);
      g.addColorStop(1, alpha(color, 0.25));
      ctx.save();
      ctx.globalAlpha = fade;
      roundRect(ctx, x, top, barW, Math.max(h, 2), Math.min(barW * 0.22, u * 0.02));
      ctx.fillStyle = g;
      ctx.fill();

      // Qiymat.
      ctx.textAlign = "center";
      ctx.font = font(700, Math.min(barW * 0.3, u * 0.035), true);
      ctx.fillStyle = isLast ? brand.accent : alpha(brand.text, 0.8);
      ctx.globalAlpha = fade * a;
      ctx.fillText(
        `${formatNumber(s.value * a)}${unit ? ` ${unit}` : ""}`,
        x + barW / 2,
        top - u * 0.05,
      );

      // Nom.
      ctx.font = font(500, Math.min(barW * 0.26, u * 0.03), true);
      ctx.fillStyle = alpha(brand.muted, 0.95);
      ctx.fillText(s.label.toUpperCase(), x + barW / 2, baseY + u * 0.025);
      ctx.restore();
    }

    ctx.restore();
    drawWatermark(rc);
  },
};

/** Ikki ustun: "oldin / keyin". */
export const compareTemplate: TemplateDef = {
  id: "compare",
  name: "Taqqoslash",
  group: "Ma'lumot",
  emoji: "⚖️",
  defaultDurationMs: 5200,
  fields: [
    { key: "kicker", label: "Bo'lim yozuvi", type: "text" },
    { key: "title", label: "Sarlavha", type: "text" },
    { key: "leftTitle", label: "Chap ustun nomi", type: "text" },
    { key: "leftItems", label: "Chap ustun", type: "list", maxItems: 4 },
    { key: "rightTitle", label: "O'ng ustun nomi", type: "text" },
    { key: "rightItems", label: "O'ng ustun", type: "list", maxItems: 4 },
  ],
  defaults: {
    kicker: "TAQQOSLASH",
    title: "Oldin va keyin",
    leftTitle: "OLDIN",
    leftItems: ["3 soat montaj", "Dizayner kerak", "Bir xil ko'rinish"],
    rightTitle: "KEYIN",
    rightItems: ["2 daqiqa", "Telefonda", "Brend uslubida"],
  },
  draw(rc) {
    drawBackground(rc);
    const { ctx, H, u, brand, t, data } = rc;
    const p = pad(rc);
    const cw = contentWidth(rc);
    const fade = sceneFade(rc);

    drawKicker(rc, String(data.kicker ?? ""), undefined, 40);

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const title = fitRich(ctx, String(data.title ?? ""), {
      maxWidth: cw,
      maxLines: 2,
      size: u * 0.078,
      weight: 900,
    });
    let y = H * 0.19;
    ctx.font = font(900, title.size);
    for (let i = 0; i < title.lines.length; i++) {
      const a = anim(t, 100 + i * 80, 540, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.translate(0, (1 - a) * u * 0.03);
      drawRichLine(ctx, title.lines[i], p, y + i * title.lineHeight, brand.text, brand.accent);
      ctx.restore();
    }
    y += title.lines.length * title.lineHeight + u * 0.06;

    const colGap = u * 0.04;
    const colW = (cw - colGap) / 2;

    const inner = u * 0.035;
    const titleGap = u * 0.075;
    const itemGap = u * 0.028;
    const itemWidth = colW - inner * 2 - u * 0.03;

    const columns = [
      {
        title: String(data.leftTitle ?? "OLDIN"),
        items: (Array.isArray(data.leftItems) ? data.leftItems : []).map(String).filter(Boolean),
        color: alpha(brand.text, 0.5),
        dot: alpha(brand.text, 0.45),
        x: p,
        delay: 300,
      },
      {
        title: String(data.rightTitle ?? "KEYIN"),
        items: (Array.isArray(data.rightItems) ? data.rightItems : []).map(String).filter(Boolean),
        color: brand.accent,
        dot: brand.accent,
        x: p + colW + colGap,
        delay: 620,
      },
    ];

    // Kartalar balandligi eng to'liq ustunga qarab hisoblanadi — bo'sh joy qolmaydi.
    const measured = columns.map((col) =>
      col.items.map((text) =>
        fitText(ctx, text, {
          maxWidth: itemWidth,
          maxLines: 3,
          size: u * 0.036,
          weight: 500,
          lineHeightRatio: 1.25,
        }),
      ),
    );
    const needed = measured.map((items) =>
      items.reduce((acc, it) => acc + it.lines.length * it.lineHeight + itemGap, 0),
    );
    const colH = Math.min(
      inner * 2 + titleGap + Math.max(...needed, itemGap) - itemGap,
      H * 0.9 - y,
    );

    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      const ca = anim(t, col.delay, 620, easeOutQuint);
      if (ca <= 0.001) continue;
      ctx.save();
      ctx.globalAlpha = fade * ca;
      ctx.translate(0, (1 - ca) * u * 0.05);
      glassCard(
        ctx,
        col.x,
        y,
        colW,
        colH,
        u * 0.035,
        alpha(brand.surface, 0.7),
        alpha(col.color, 0.4),
        2.5,
      );

      ctx.font = font(700, u * 0.032, true);
      ctx.fillStyle = col.color;
      ctx.fillText(col.title.toUpperCase(), col.x + inner, y + inner);

      let iy = y + inner + titleGap;
      for (let i = 0; i < col.items.length; i++) {
        const ia = anim(t, col.delay + 200 + i * 180, 480, easeOutQuint);
        if (ia <= 0.001) continue;
        const item = measured[c][i];
        ctx.save();
        ctx.globalAlpha = fade * ca * ia;
        ctx.fillStyle = col.dot;
        ctx.beginPath();
        ctx.arc(col.x + inner + u * 0.008, iy + item.size * 0.55, u * 0.008, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = brand.text;
        ctx.font = font(500, item.size);
        for (let l = 0; l < item.lines.length; l++) {
          ctx.fillText(item.lines[l], col.x + inner + u * 0.03, iy + l * item.lineHeight);
        }
        ctx.restore();
        iy += item.lines.length * item.lineHeight + itemGap;
      }
      ctx.restore();
    }

    ctx.restore();
    drawWatermark(rc);
  },
};

/** Bosqichlar oqimi — strelkalar bilan bog'langan kartalar. */
export const stepsTemplate: TemplateDef = {
  id: "steps",
  name: "Bosqichlar",
  group: "Ma'lumot",
  emoji: "🔗",
  defaultDurationMs: 4800,
  fields: [
    { key: "kicker", label: "Bo'lim yozuvi", type: "text" },
    { key: "title", label: "Sarlavha", type: "text" },
    { key: "steps", label: "Bosqichlar", type: "list", maxItems: 4 },
  ],
  defaults: {
    kicker: "JARAYON",
    title: "Qanday ishlaydi",
    steps: ["Skript", "Shablon", "Eksport"],
  },
  draw(rc) {
    drawBackground(rc);
    const { ctx, H, u, brand, t, data } = rc;
    const p = pad(rc);
    const cw = contentWidth(rc);
    const fade = sceneFade(rc);
    const steps = (Array.isArray(data.steps) ? data.steps : [])
      .map(String)
      .filter((s) => s.trim())
      .slice(0, 4);

    drawKicker(rc, String(data.kicker ?? ""), undefined, 40);

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const title = fitRich(ctx, String(data.title ?? ""), {
      maxWidth: cw,
      maxLines: 2,
      size: u * 0.08,
      weight: 900,
    });
    let y = H * 0.2;
    ctx.font = font(900, title.size);
    for (let i = 0; i < title.lines.length; i++) {
      const a = anim(t, 100 + i * 80, 540, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.translate(0, (1 - a) * u * 0.03);
      drawRichLine(ctx, title.lines[i], p, y + i * title.lineHeight, brand.text, brand.accent);
      ctx.restore();
    }
    y += title.lines.length * title.lineHeight + u * 0.07;

    if (!steps.length) {
      ctx.restore();
      drawWatermark(rc);
      return;
    }

    const available = Math.min(H * 0.5, H * 0.88 - y);
    const arrowH = u * 0.055;
    const cardH = (available - arrowH * (steps.length - 1)) / steps.length;

    for (let i = 0; i < steps.length; i++) {
      const delay = 340 + i * 420;
      const a = anim(t, delay, 600, easeOutQuint);
      if (a <= 0.001) continue;
      const cardY = y + i * (cardH + arrowH);
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.translate((1 - a) * u * 0.05, 0);
      glassCard(
        ctx,
        p,
        cardY,
        cw,
        cardH,
        u * 0.032,
        alpha(brand.surface, 0.8),
        alpha(brand.accent, 0.35),
        2.5,
      );
      const badge = cardH * 0.46;
      ctx.save();
      ctx.translate(p + u * 0.045 + badge / 2, cardY + cardH / 2);
      roundRect(ctx, -badge / 2, -badge / 2, badge, badge, badge * 0.32);
      ctx.fillStyle = alpha(brand.accent, 0.18);
      ctx.fill();
      ctx.fillStyle = brand.accent;
      ctx.font = font(700, badge * 0.44, true);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), 0, badge * 0.02);
      ctx.restore();

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const tx = p + u * 0.045 + badge + u * 0.045;
      const item = fitText(ctx, steps[i], {
        maxWidth: cw - (tx - p) - u * 0.045,
        maxLines: 2,
        size: u * 0.05,
        weight: 700,
        lineHeightRatio: 1.2,
      });
      ctx.fillStyle = brand.text;
      ctx.font = font(700, item.size);
      const startY = cardY + cardH / 2 - ((item.lines.length - 1) * item.lineHeight) / 2;
      for (let l = 0; l < item.lines.length; l++) {
        ctx.fillText(item.lines[l], tx, startY + l * item.lineHeight);
      }
      ctx.restore();

      if (i < steps.length - 1) {
        const aa = anim(t, delay + 260, 380, easeOutQuint);
        if (aa > 0.001) {
          ctx.save();
          ctx.globalAlpha = fade * aa;
          ctx.strokeStyle = alpha(brand.accent, 0.7);
          ctx.lineWidth = 3;
          const ax = p + cw / 2;
          const ay = cardY + cardH;
          ctx.beginPath();
          ctx.moveTo(ax, ay + arrowH * 0.15);
          ctx.lineTo(ax, ay + arrowH * 0.75);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ax - arrowH * 0.16, ay + arrowH * 0.58);
          ctx.lineTo(ax, ay + arrowH * 0.82);
          ctx.lineTo(ax + arrowH * 0.16, ay + arrowH * 0.58);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    ctx.restore();
    drawWatermark(rc);
  },
};
