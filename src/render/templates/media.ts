import type { TemplateDef } from "../../types";
import { drawBackground } from "../background";
import { contentWidth, drawKicker, drawWatermark, pad , sceneFade } from "../chrome";
import {
  alpha,
  drawImageCover,
  fitText,
  font,
  glassCard,
  lighten,
  roundRect,
} from "../draw";
import { anim, clamp, easeOutCubic, easeOutQuint, mix } from "../anim";
import { drawRichLine, fitRich } from "../richtext";

/** Rasm + Ken Burns harakati + izoh. */
export const imageTemplate: TemplateDef = {
  id: "image",
  name: "Rasm",
  group: "Media",
  emoji: "🖼️",
  defaultDurationMs: 3600,
  fields: [
    { key: "image", label: "Rasm", type: "image" },
    { key: "kicker", label: "Bo'lim yozuvi", type: "text" },
    { key: "caption", label: "Izoh", type: "textarea" },
    {
      key: "effect",
      label: "Harakat",
      type: "select",
      options: [
        { value: "zoom-in", label: "Yaqinlashish" },
        { value: "zoom-out", label: "Uzoqlashish" },
        { value: "pan-left", label: "Chapga siljish" },
        { value: "pan-right", label: "O'ngga siljish" },
        { value: "none", label: "Harakatsiz" },
      ],
    },
    {
      key: "frame",
      label: "Ko'rinishi",
      type: "select",
      options: [
        { value: "full", label: "To'liq ekran" },
        { value: "card", label: "Karta ichida" },
      ],
    },
  ],
  defaults: {
    image: "",
    kicker: "",
    caption: "Bu yerga izoh yozing",
    effect: "zoom-in",
    frame: "full",
  },
  draw(rc) {
    const { ctx, W, H, brand, t, dur, data } = rc;
    const p = pad(rc);
    const cw = contentWidth(rc);
    const fade = sceneFade(rc);
    const full = String(data.frame ?? "full") === "full";
    const img = data.image ? rc.images.get(String(data.image)) : undefined;

    drawBackground(rc);

    const k = clamp(t / Math.max(dur, 1));
    const effect = String(data.effect ?? "zoom-in");
    let zoom = 1.06;
    let panX = 0.5;
    if (effect === "zoom-in") zoom = mix(1.02, 1.16, k);
    else if (effect === "zoom-out") zoom = mix(1.16, 1.02, k);
    else if (effect === "pan-left") {
      zoom = 1.18;
      panX = mix(0.75, 0.25, k);
    } else if (effect === "pan-right") {
      zoom = 1.18;
      panX = mix(0.25, 0.75, k);
    } else zoom = 1.02;

    const appear = anim(t, 0, 640, easeOutCubic);

    if (img) {
      ctx.save();
      ctx.globalAlpha = fade * appear;
      if (full) {
        drawImageCover(ctx, img, 0, 0, W, H, zoom, panX, 0.5);
        // Matn o'qilishi uchun pastdan gradient.
        const g = ctx.createLinearGradient(0, H * 0.32, 0, H);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, alpha(brand.bg, 0.96));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        const gt = ctx.createLinearGradient(0, 0, 0, H * 0.3);
        gt.addColorStop(0, alpha(brand.bg, 0.8));
        gt.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gt;
        ctx.fillRect(0, 0, W, H * 0.3);
      } else {
        const cardY = H * 0.16;
        const cardH = H * 0.46;
        const scale = mix(0.94, 1, appear);
        ctx.translate(W / 2, cardY + cardH / 2);
        ctx.scale(scale, scale);
        ctx.translate(-W / 2, -(cardY + cardH / 2));
        ctx.save();
        roundRect(ctx, p, cardY, cw, cardH, W * 0.045);
        ctx.clip();
        drawImageCover(ctx, img, p, cardY, cw, cardH, zoom, panX, 0.5);
        ctx.restore();
        roundRect(ctx, p, cardY, cw, cardH, W * 0.045);
        ctx.strokeStyle = alpha(brand.accent, 0.35);
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Rasm tanlanmagan — joy egallovchi ramka.
      ctx.save();
      ctx.globalAlpha = fade * 0.6;
      const boxY = H * 0.2;
      const boxH = H * 0.4;
      ctx.setLineDash([16, 14]);
      glassCard(ctx, p, boxY, cw, boxH, W * 0.045, alpha(brand.surface, 0.5), alpha(brand.muted, 0.6), 3);
      ctx.setLineDash([]);
      ctx.fillStyle = brand.muted;
      ctx.font = font(500, W * 0.038, true);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("RASM TANLANMAGAN", W / 2, boxY + boxH / 2);
      ctx.restore();
    }

    drawKicker(rc, String(data.kicker ?? ""), undefined, 120);

    const caption = String(data.caption ?? "").trim();
    if (caption) {
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const cap = fitRich(ctx, caption, {
        maxWidth: cw,
        maxLines: 4,
        size: W * 0.068,
        weight: 800,
        lineHeightRatio: 1.18,
      });
      const totalH = cap.lines.length * cap.lineHeight;
      const y = full ? H * 0.78 - totalH / 2 : H * 0.72;
      ctx.font = font(800, cap.size);
      for (let i = 0; i < cap.lines.length; i++) {
        const a = anim(t, 320 + i * 110, 600, easeOutQuint);
        if (a <= 0.001) continue;
        ctx.save();
        ctx.globalAlpha = fade * a;
        ctx.translate(0, (1 - a) * W * 0.04);
        drawRichLine(ctx, cap.lines[i], p, y + i * cap.lineHeight, brand.text, brand.accent);
        ctx.restore();
      }
      ctx.restore();
    }

    drawWatermark(rc);
  },
};

const KEYWORDS =
  /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|new|async|await|try|catch|def|print|public|private|void|int|string|bool|null|true|false|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN)\b/;

interface CodeToken {
  text: string;
  kind: "kw" | "str" | "num" | "com" | "plain";
}

function highlight(line: string): CodeToken[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("--")) {
    return [{ text: line, kind: "com" }];
  }
  const out: CodeToken[] = [];
  const re = /("[^"]*"|'[^']*'|`[^`]*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|([\s\S])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m[1]) out.push({ text: m[1], kind: "str" });
    else if (m[2]) out.push({ text: m[2], kind: "num" });
    else if (m[3]) out.push({ text: m[3], kind: KEYWORDS.test(m[3]) ? "kw" : "plain" });
    else out.push({ text: m[4], kind: "plain" });
  }
  return out;
}

/** Kod bloki — harf-harf yoziladigan terminal ko'rinishi. */
export const codeTemplate: TemplateDef = {
  id: "code",
  name: "Kod / Terminal",
  group: "Media",
  emoji: "⌨️",
  defaultDurationMs: 5200,
  fields: [
    { key: "kicker", label: "Bo'lim yozuvi", type: "text" },
    { key: "filename", label: "Fayl nomi", type: "text", placeholder: "app.ts" },
    { key: "code", label: "Kod", type: "textarea", placeholder: "const x = 1;" },
    { key: "typewriter", label: "Harf-harf yozilsin", type: "toggle" },
    { key: "caption", label: "Pastdagi izoh", type: "text" },
  ],
  defaults: {
    kicker: "KOD",
    filename: "kiovo.ts",
    code: 'const video = await kiovo.render({\n  scenes: 6,\n  brand: "kiovo",\n});\n// 1080x1920, 30fps',
    typewriter: true,
    caption: "",
  },
  draw(rc) {
    drawBackground(rc);
    const { ctx, W, H, brand, t, dur, data } = rc;
    const p = pad(rc);
    const cw = contentWidth(rc);
    const fade = sceneFade(rc);
    const lines = String(data.code ?? "").split("\n").slice(0, 14);
    const typewriter = data.typewriter !== false;

    drawKicker(rc, String(data.kicker ?? ""), undefined, 40);

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    // Kod o'lchamini eng uzun qatorga moslash.
    let size = W * 0.042;
    const inner = W * 0.045;
    const maxLineW = cw - inner * 2 - W * 0.06;
    for (let guard = 0; guard < 40; guard++) {
      ctx.font = font(400, size, true);
      const widest = lines.reduce((a, l) => Math.max(a, ctx.measureText(l).width), 0);
      if (widest <= maxLineW || size <= W * 0.018) break;
      size *= 0.95;
    }
    const lh = size * 1.62;
    const headerH = W * 0.085;
    const boxH = headerH + inner * 1.4 + lines.length * lh;
    const boxY = H * 0.34 - boxH / 2 + H * 0.06;

    const appear = anim(t, 60, 620, easeOutQuint);
    ctx.save();
    ctx.globalAlpha = fade * appear;
    ctx.translate(0, (1 - appear) * W * 0.05);
    glassCard(
      ctx,
      p,
      boxY,
      cw,
      boxH,
      W * 0.035,
      alpha(lighten(brand.bg, 0.05), 0.95),
      alpha(brand.text, 0.14),
      2.5,
    );

    // Sarlavha paneli.
    ctx.save();
    roundRect(ctx, p, boxY, cw, headerH, W * 0.035);
    ctx.clip();
    ctx.fillStyle = alpha(brand.text, 0.05);
    ctx.fillRect(p, boxY, cw, headerH);
    ctx.restore();
    const dotR = headerH * 0.11;
    const dots = [alpha("#ff5f57", 0.9), alpha("#febc2e", 0.9), alpha(brand.accent, 0.9)];
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(p + inner + i * dotR * 3.2 + dotR, boxY + headerH / 2, dotR, 0, Math.PI * 2);
      ctx.fillStyle = dots[i];
      ctx.fill();
    }
    const filename = String(data.filename ?? "").trim();
    if (filename) {
      ctx.font = font(500, headerH * 0.32, true);
      ctx.fillStyle = alpha(brand.text, 0.55);
      ctx.textBaseline = "middle";
      ctx.fillText(filename, p + inner + dotR * 12, boxY + headerH / 2);
      ctx.textBaseline = "top";
    }

    // Kod qatorlari.
    const colors: Record<CodeToken["kind"], string> = {
      kw: brand.accent,
      str: brand.accent2,
      num: lighten(brand.accent2, 0.25),
      com: alpha(brand.text, 0.4),
      plain: alpha(brand.text, 0.92),
    };
    const totalChars = lines.reduce((a, l) => a + l.length + 1, 0);
    const typed = typewriter
      ? Math.round(totalChars * anim(t, 320, Math.max(600, dur * 0.6), easeOutCubic))
      : totalChars;

    ctx.font = font(400, size, true);
    let consumed = 0;
    let caret: { x: number; y: number } | null = null;
    for (let i = 0; i < lines.length; i++) {
      const lineY = boxY + headerH + inner + i * lh;
      const avail = typed - consumed;
      if (avail <= 0) break;
      const visible = lines[i].slice(0, Math.max(0, avail));
      consumed += lines[i].length + 1;

      ctx.fillStyle = alpha(brand.text, 0.22);
      ctx.font = font(400, size * 0.8, true);
      ctx.fillText(String(i + 1).padStart(2, " "), p + inner, lineY + size * 0.12);

      ctx.font = font(400, size, true);
      let x = p + inner + W * 0.05;
      for (const tk of highlight(visible)) {
        ctx.fillStyle = colors[tk.kind];
        ctx.fillText(tk.text, x, lineY);
        x += ctx.measureText(tk.text).width;
      }
      caret = { x, y: lineY };
    }
    if (caret && typed < totalChars && Math.floor(t / 420) % 2 === 0) {
      ctx.fillStyle = brand.accent;
      ctx.fillRect(caret.x + 2, caret.y, size * 0.55, size * 1.1);
    }
    ctx.restore();

    const caption = String(data.caption ?? "").trim();
    if (caption) {
      const ca = anim(t, 700, 560, easeOutQuint);
      ctx.save();
      ctx.globalAlpha = fade * ca;
      const cap = fitText(ctx, caption, {
        maxWidth: cw,
        maxLines: 2,
        size: W * 0.05,
        weight: 700,
        lineHeightRatio: 1.24,
      });
      ctx.font = font(700, cap.size);
      ctx.fillStyle = brand.text;
      for (let i = 0; i < cap.lines.length; i++) {
        ctx.fillText(cap.lines[i], p, boxY + boxH + W * 0.075 + i * cap.lineHeight);
      }
      ctx.restore();
    }

    ctx.restore();
    drawWatermark(rc);
  },
};
