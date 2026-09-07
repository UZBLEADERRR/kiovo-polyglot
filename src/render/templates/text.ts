import type { RenderContext, TemplateDef } from "../../types";
import { drawBackground } from "../background";
import { contentWidth, drawKicker, drawRule, drawWatermark, pad , sceneFade } from "../chrome";
import { alpha, drawImageCover, fitText, font, glassCard, roundRect } from "../draw";
import { anim, easeOutBack, easeOutQuint } from "../anim";
import { drawRichLine, fitRich } from "../richtext";

/** Sarlavha + tagsarlavha — videoning "ilgagi". */
export const hookTemplate: TemplateDef = {
  id: "hook",
  name: "Sarlavha / Ilgak",
  group: "Matn",
  emoji: "✳️",
  defaultDurationMs: 3200,
  fields: [
    { key: "kicker", label: "Bo'lim yozuvi", type: "text", placeholder: "THE PRESSURE TEST" },
    {
      key: "headline",
      label: "Katta sarlavha",
      type: "textarea",
      placeholder: "MILLIONLAB foydalanuvchi",
      help: "Bitta so'zni yashil qilish uchun yulduzcha ichiga oling: *shunday*",
    },
    { key: "subline", label: "Tagsarlavha", type: "textarea", placeholder: "Bitta ma'lumotlar bazasi." },
    {
      key: "align",
      label: "Joylashuv",
      type: "select",
      options: [
        { value: "left", label: "Chapga" },
        { value: "center", label: "Markazga" },
      ],
    },
  ],
  defaults: {
    kicker: "BOSHLANISH",
    headline: "Brendingiz *o'sadi*",
    subline: "Bir daqiqada tayyor bo'lgan video bilan.",
    align: "left",
  },
  draw(rc) {
    drawBackground(rc);
    const { ctx, W, H, u, brand, t, data } = rc;
    const p = pad(rc);
    const cw = contentWidth(rc);
    const center = data.align === "center";
    const fade = sceneFade(rc);

    drawKicker(rc, String(data.kicker ?? ""), undefined, 60);

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const head = fitRich(ctx, String(data.headline ?? ""), {
      maxWidth: cw,
      maxLines: 4,
      size: u * 0.125,
      weight: 900,
    });

    ctx.font = font(400, u * 0.05);
    const sub = fitText(ctx, String(data.subline ?? ""), {
      maxWidth: cw,
      maxLines: 3,
      size: u * 0.05,
      weight: 400,
      lineHeightRatio: 1.3,
    });

    // Sarlavha → aksent chizig'i → tagsarlavha oralig'i.
    const ruleTop = u * 0.075;
    const ruleBottom = u * 0.06;
    const headH = head.lines.length * head.lineHeight;
    const subH = String(data.subline ?? "").trim() ? sub.lines.length * sub.lineHeight : 0;
    const totalH = headH + ruleTop + ruleBottom + subH;
    let y = H * 0.44 - totalH / 2;

    ctx.font = font(900, head.size);
    for (let i = 0; i < head.lines.length; i++) {
      const a = anim(t, 160 + i * 95, 640, easeOutQuint);
      if (a <= 0.001) continue;
      const line = head.lines[i];
      const x = center ? (W - line.width) / 2 : p;
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.translate(0, (1 - a) * u * 0.05);
      drawRichLine(ctx, line, x, y + i * head.lineHeight, brand.text, brand.accent);
      ctx.restore();
    }
    y += headH + ruleTop;

    const ruleW = cw * 0.22;
    drawRule(rc, center ? (W - ruleW) / 2 : p, y, ruleW, 320);
    y += ruleBottom;

    if (subH) {
      ctx.font = font(400, sub.size);
      ctx.fillStyle = brand.muted;
      for (let i = 0; i < sub.lines.length; i++) {
        const a = anim(t, 460 + i * 90, 560, easeOutQuint);
        if (a <= 0.001) continue;
        const line = sub.lines[i];
        const x = center ? (W - ctx.measureText(line).width) / 2 : p;
        ctx.save();
        ctx.globalAlpha = fade * a;
        ctx.translate(0, (1 - a) * u * 0.03);
        ctx.fillText(line, x, y + i * sub.lineHeight);
        ctx.restore();
      }
    }

    ctx.restore();
    drawWatermark(rc);
  },
};

/** Ro'yxat — ketma-ket chiqadigan punktlar. */
export const bulletsTemplate: TemplateDef = {
  id: "bullets",
  name: "Ro'yxat",
  group: "Matn",
  emoji: "☑️",
  defaultDurationMs: 5200,
  fields: [
    { key: "kicker", label: "Bo'lim yozuvi", type: "text" },
    { key: "title", label: "Sarlavha", type: "text" },
    { key: "items", label: "Punktlar", type: "list", maxItems: 6 },
    {
      key: "marker",
      label: "Belgisi",
      type: "select",
      options: [
        { value: "number", label: "Raqam" },
        { value: "check", label: "Belgi ✓" },
        { value: "dot", label: "Nuqta" },
      ],
    },
  ],
  defaults: {
    kicker: "QADAMLAR",
    title: "Nima qilamiz",
    items: ["Skript yozasiz", "Shablon tanlaysiz", "Eksport qilasiz"],
    marker: "number",
  },
  draw(rc) {
    drawBackground(rc);
    const { ctx, H, u, brand, t, dur, data } = rc;
    const p = pad(rc);
    const cw = contentWidth(rc);
    const items = (Array.isArray(data.items) ? data.items : []).map(String).filter((s) => s.trim());
    const fade = sceneFade(rc);
    const marker = String(data.marker ?? "number");

    drawKicker(rc, String(data.kicker ?? ""), undefined, 40);

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const title = fitRich(ctx, String(data.title ?? ""), {
      maxWidth: cw,
      maxLines: 2,
      size: u * 0.085,
      weight: 900,
    });

    let y = H * 0.2;
    ctx.font = font(900, title.size);
    for (let i = 0; i < title.lines.length; i++) {
      const a = anim(t, 120 + i * 80, 560, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.translate(0, (1 - a) * u * 0.035);
      drawRichLine(ctx, title.lines[i], p, y + i * title.lineHeight, brand.text, brand.accent);
      ctx.restore();
    }
    y += title.lines.length * title.lineHeight + u * 0.06;

    const rowH = Math.min(u * 0.165, (H * 0.62 - (y - H * 0.2)) / Math.max(items.length, 1));
    const badge = rowH * 0.52;
    const step = Math.max(220, Math.min(420, (dur - 900) / Math.max(items.length, 1)));

    for (let i = 0; i < items.length; i++) {
      const delay = 380 + i * step;
      const a = anim(t, delay, 520, easeOutQuint);
      if (a <= 0.001) continue;
      const rowY = y + i * rowH;
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.translate((1 - a) * u * 0.06, 0);

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const textX = p + badge + u * 0.045;
      const item = fitText(ctx, items[i], {
        maxWidth: cw - (badge + u * 0.045),
        maxLines: 2,
        size: u * 0.048,
        weight: 500,
        lineHeightRatio: 1.22,
      });
      // Nishon birinchi qator markaziga tenglashadi.
      const cy = rowY + item.size * 0.55;
      const pop = anim(t, delay, 460, easeOutBack);
      ctx.save();
      ctx.translate(p + badge / 2, cy);
      ctx.scale(pop, pop);
      if (marker === "dot") {
        ctx.fillStyle = brand.accent;
        ctx.beginPath();
        ctx.arc(0, 0, badge * 0.22, 0, Math.PI * 2);
        ctx.fill();
      } else {
        roundRect(ctx, -badge / 2, -badge / 2, badge, badge, badge * 0.3);
        ctx.fillStyle = alpha(brand.accent, 0.16);
        ctx.fill();
        ctx.strokeStyle = alpha(brand.accent, 0.5);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = brand.accent;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (marker === "check") {
          ctx.font = font(700, badge * 0.5);
          ctx.fillText("✓", 0, badge * 0.03);
        } else {
          ctx.font = font(700, badge * 0.42, true);
          ctx.fillText(String(i + 1).padStart(2, "0"), 0, badge * 0.03);
        }
      }
      ctx.restore();

      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = brand.text;
      ctx.font = font(500, item.size);
      for (let l = 0; l < item.lines.length; l++) {
        ctx.fillText(item.lines[l], textX, rowY + l * item.lineHeight);
      }
      ctx.restore();

      // Oxirgi qatordan keyin ajratuvchi chiziq chizilmaydi.
      if (i < items.length - 1) {
        ctx.save();
        ctx.globalAlpha = fade * a * 0.18;
        ctx.strokeStyle = brand.text;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p, rowY + rowH * 0.8);
        ctx.lineTo(p + cw, rowY + rowH * 0.8);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
    drawWatermark(rc);
  },
};

/** Iqtibos / mijoz fikri. */
export const quoteTemplate: TemplateDef = {
  id: "quote",
  name: "Iqtibos",
  group: "Matn",
  emoji: "❝",
  defaultDurationMs: 4200,
  fields: [
    { key: "quote", label: "Matn", type: "textarea" },
    { key: "author", label: "Muallif", type: "text" },
    { key: "role", label: "Lavozimi", type: "text" },
    { key: "avatar", label: "Rasm", type: "image" },
  ],
  defaults: {
    quote: "Bu ilova bizning kontent ishlab chiqarishimizni *10 barobar* tezlashtirdi.",
    author: "Sarvarbek",
    role: "Kiovo asoschisi",
    avatar: "",
  },
  draw(rc) {
    drawBackground(rc);
    const { ctx, H, u, brand, t, data } = rc;
    const p = pad(rc);
    const cw = contentWidth(rc);
    const fade = sceneFade(rc);

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const markA = anim(t, 60, 620, easeOutBack);
    ctx.save();
    ctx.globalAlpha = fade * markA * 0.25;
    ctx.fillStyle = brand.accent;
    ctx.font = font(900, u * 0.28);
    ctx.fillText("“", p - u * 0.015, H * 0.2 - u * 0.06);
    ctx.restore();

    const q = fitRich(ctx, String(data.quote ?? ""), {
      maxWidth: cw,
      maxLines: 6,
      size: u * 0.078,
      weight: 700,
      lineHeightRatio: 1.22,
    });
    const totalH = q.lines.length * q.lineHeight;
    let y = H * 0.42 - totalH / 2;

    ctx.font = font(700, q.size);
    for (let i = 0; i < q.lines.length; i++) {
      const a = anim(t, 200 + i * 100, 620, easeOutQuint);
      if (a <= 0.001) continue;
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.translate(0, (1 - a) * u * 0.04);
      drawRichLine(ctx, q.lines[i], p, y + i * q.lineHeight, brand.text, brand.accent);
      ctx.restore();
    }
    y += totalH + u * 0.075;

    const author = String(data.author ?? "").trim();
    if (author) {
      const aa = anim(t, 620, 560, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * aa;
      ctx.translate(0, (1 - aa) * u * 0.03);
      const avatarId = String(data.avatar ?? "");
      const img = avatarId ? rc.images.get(avatarId) : undefined;
      const s = u * 0.11;
      let x = p;
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
        ctx.clip();
        drawImageCover(ctx, img, x, y, s, s);
        ctx.restore();
        ctx.strokeStyle = alpha(brand.accent, 0.6);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
        ctx.stroke();
        x += s + u * 0.035;
      }
      ctx.fillStyle = brand.text;
      ctx.font = font(700, u * 0.042);
      ctx.fillText(author, x, y + (img ? s * 0.12 : 0));
      const role = String(data.role ?? "").trim();
      if (role) {
        ctx.fillStyle = alpha(brand.muted, 0.9);
        ctx.font = font(500, u * 0.032, true);
        ctx.fillText(role.toUpperCase(), x, y + (img ? s * 0.12 : 0) + u * 0.058);
      }
      ctx.restore();
    }

    ctx.restore();
    drawWatermark(rc);
  },
};

/** Bitta yirik gap — ekranni to'ldiradigan "punch line". */
export const statementTemplate: TemplateDef = {
  id: "statement",
  name: "Kuchli gap",
  group: "Matn",
  emoji: "⚡",
  defaultDurationMs: 2600,
  fields: [
    { key: "text", label: "Matn", type: "textarea", help: "*Yulduzcha* ichidagi so'z urg'u rangida chiqadi." },
    { key: "note", label: "Kichik izoh", type: "text" },
    {
      key: "boxed",
      label: "Ramka ichida",
      type: "toggle",
    },
  ],
  defaults: {
    text: "Kontent *to'xtamasligi* kerak.",
    note: "Har kuni bitta video — bir oyda 30 ta.",
    boxed: false,
  },
  draw(rc: RenderContext) {
    drawBackground(rc);
    const { ctx, W, H, u, brand, t, data } = rc;
    const p = pad(rc);
    const cw = contentWidth(rc);
    const fade = sceneFade(rc);
    const boxed = Boolean(data.boxed);

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    const inset = boxed ? u * 0.055 : 0;
    const body = fitRich(ctx, String(data.text ?? ""), {
      maxWidth: cw - inset * 2,
      maxLines: 5,
      size: u * 0.115,
      weight: 900,
      lineHeightRatio: 1.12,
    });
    const totalH = body.lines.length * body.lineHeight;
    const note = String(data.note ?? "").trim();
    const boxH = totalH + inset * 2;
    const boxY = H * 0.42 - boxH / 2;

    if (boxed) {
      const ba = anim(t, 40, 620, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * ba;
      glassCard(
        ctx,
        p,
        boxY,
        cw,
        boxH,
        u * 0.045,
        alpha(brand.surface, 0.75),
        alpha(brand.accent, 0.35),
        2.5,
      );
      ctx.restore();
    }

    ctx.font = font(900, body.size);
    for (let i = 0; i < body.lines.length; i++) {
      const a = anim(t, 140 + i * 105, 640, easeOutQuint);
      if (a <= 0.001) continue;
      const line = body.lines[i];
      const x = p + inset + (cw - inset * 2 - line.width) / 2;
      ctx.save();
      ctx.globalAlpha = fade * a;
      ctx.translate(0, (1 - a) * u * 0.045);
      drawRichLine(ctx, line, x, boxY + inset + i * body.lineHeight, brand.text, brand.accent);
      ctx.restore();
    }

    if (note) {
      const na = anim(t, 520, 560, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * na * 0.85;
      ctx.font = font(500, u * 0.034, true);
      ctx.fillStyle = brand.muted;
      const nw = ctx.measureText(note.toUpperCase()).width;
      ctx.fillText(note.toUpperCase(), (W - nw) / 2, boxY + boxH + u * 0.06);
      ctx.restore();
    }

    ctx.restore();
    drawWatermark(rc);
  },
};
