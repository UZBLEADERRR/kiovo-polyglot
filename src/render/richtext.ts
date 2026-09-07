import { font } from "./draw";

export interface Token {
  text: string;
  accent: boolean;
}

export interface RichLine {
  tokens: Token[];
  width: number;
}

/**
 * `*so'z*` ko'rinishidagi bo'laklarni urg'uli deb belgilaydi.
 * Reels uslubidagi "bitta so'z yashil" effekti shundan chiqadi.
 */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const src = String(text ?? "");
  const re = /\*([^*\n]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ text: src.slice(last, m.index), accent: false });
    out.push({ text: m[1], accent: true });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last), accent: false });
  return out.length ? out : [{ text: src, accent: false }];
}

/** Urg'u belgilarisiz toza matn (o'lchash/wrap uchun). */
export function plain(text: string): string {
  return String(text ?? "").replace(/\*([^*\n]+)\*/g, "$1");
}

function tokensToWords(tokens: Token[]): { word: string; accent: boolean; nl: boolean }[] {
  const words: { word: string; accent: boolean; nl: boolean }[] = [];
  for (const tk of tokens) {
    const parts = tk.text.split(/(\n)/);
    for (const part of parts) {
      if (part === "\n") {
        words.push({ word: "", accent: false, nl: true });
        continue;
      }
      for (const w of part.split(/\s+/)) {
        if (w) words.push({ word: w, accent: tk.accent, nl: false });
      }
    }
  }
  return words;
}

export function wrapRich(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): RichLine[] {
  const words = tokensToWords(tokenize(text));
  const space = ctx.measureText(" ").width;
  const lines: RichLine[] = [];
  let cur: Token[] = [];
  let curW = 0;

  const flush = () => {
    lines.push({ tokens: cur, width: curW });
    cur = [];
    curW = 0;
  };

  for (const w of words) {
    if (w.nl) {
      flush();
      continue;
    }
    const ww = ctx.measureText(w.word).width;
    const add = cur.length ? space + ww : ww;
    if (cur.length && curW + add > maxWidth) flush();
    cur.push({ text: w.word, accent: w.accent });
    curW += cur.length === 1 ? ww : space + ww;
  }
  if (cur.length || !lines.length) flush();
  return lines;
}

export interface FitRichResult {
  lines: RichLine[];
  size: number;
  lineHeight: number;
}

export function fitRich(
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
): FitRichResult {
  const {
    maxWidth,
    maxLines,
    size,
    minSize = Math.max(16, size * 0.38),
    weight = 900,
    mono = false,
    lineHeightRatio = 1.08,
  } = opts;
  let s = size;
  let lines: RichLine[] = [];
  for (let guard = 0; guard < 70; guard++) {
    ctx.font = font(weight, s, mono);
    lines = wrapRich(ctx, text, maxWidth);
    const tooWide = lines.some((l) => l.width > maxWidth + 0.5);
    if (lines.length <= maxLines && !tooWide) break;
    if (s <= minSize) break;
    s = Math.max(minSize, s * 0.94);
  }
  ctx.font = font(weight, s, mono);
  return { lines, size: s, lineHeight: s * lineHeightRatio };
}

/** Bitta qatorni chapdan chizadi, urg'uli so'zlarni boshqa rangda. */
export function drawRichLine(
  ctx: CanvasRenderingContext2D,
  line: RichLine,
  x: number,
  y: number,
  baseColor: string,
  accentColor: string,
) {
  const space = ctx.measureText(" ").width;
  let cx = x;
  for (let i = 0; i < line.tokens.length; i++) {
    const tk = line.tokens[i];
    if (i > 0) cx += space;
    ctx.fillStyle = tk.accent ? accentColor : baseColor;
    ctx.fillText(tk.text, cx, y);
    cx += ctx.measureText(tk.text).width;
  }
}
