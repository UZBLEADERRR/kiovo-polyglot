import { ASPECTS, type Project, type RenderContext, type Scene, type TransitionId } from "../types";
import { getTemplate } from "./templates";
import { clamp, easeInOutCubic, easeOutQuint } from "./anim";

export const TRANSITION_MS = 420;

export interface SceneSlice {
  scene: Scene;
  index: number;
  start: number;
  end: number;
}

export function layoutScenes(project: Project): SceneSlice[] {
  let cursor = 0;
  return project.scenes.map((scene, index) => {
    const dur = Math.max(400, Number(scene.durationMs) || 3000);
    const slice = { scene, index, start: cursor, end: cursor + dur };
    cursor += dur;
    return slice;
  });
}

export function totalDuration(project: Project): number {
  return project.scenes.reduce((a, s) => a + Math.max(400, Number(s.durationMs) || 3000), 0);
}

export function sliceAt(slices: SceneSlice[], timeMs: number): SceneSlice | undefined {
  if (!slices.length) return undefined;
  const t = clamp(timeMs, 0, slices[slices.length - 1].end - 1);
  return slices.find((s) => t >= s.start && t < s.end) ?? slices[slices.length - 1];
}

/** Bir xil o'lchamdagi yordamchi kanvaslar qayta ishlatiladi. */
const scratch: Record<string, HTMLCanvasElement> = {};
function scratchCanvas(key: string, w: number, h: number): HTMLCanvasElement {
  let c = scratch[key];
  if (!c) {
    c = document.createElement("canvas");
    scratch[key] = c;
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return c;
}

interface DrawSceneOptions {
  images: Map<string, HTMLImageElement>;
  draft: boolean;
  /** Keyingi sahnaga o'tish effekti bo'lsa, sahna o'z so'nishini o'chiradi. */
  noOutro: boolean;
  total: number;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  project: Project,
  slice: SceneSlice,
  localMs: number,
  pxW: number,
  pxH: number,
  opts: DrawSceneOptions,
) {
  const aspect = ASPECTS[project.aspect];
  const template = getTemplate(slice.scene.template);
  const dur = Math.max(400, Number(slice.scene.durationMs) || 3000);
  const t = clamp(localMs, 0, dur);

  ctx.save();
  ctx.setTransform(pxW / aspect.w, 0, 0, pxH / aspect.h, 0, 0);
  ctx.clearRect(0, 0, aspect.w, aspect.h);

  const rc: RenderContext = {
    ctx,
    W: aspect.w,
    H: aspect.h,
    t,
    dur,
    p: t / dur,
    brand: project.brand,
    data: slice.scene.data,
    images: opts.images,
    index: slice.index,
    total: opts.total,
    draft: opts.draft,
  };
  // Shablonlar `sceneFade` orqali o'qiydi.
  (rc as RenderContext & { noOutro: boolean }).noOutro = opts.noOutro;

  try {
    template.draw(rc);
  } catch (err) {
    // Bitta sahnadagi xato butun eksportni to'xtatmasligi kerak.
    console.error("Sahna chizishda xato:", template.id, err);
    ctx.fillStyle = project.brand.bg;
    ctx.fillRect(0, 0, aspect.w, aspect.h);
  }
  ctx.restore();
}

function composite(
  ctx: CanvasRenderingContext2D,
  from: HTMLCanvasElement,
  to: HTMLCanvasElement,
  transition: TransitionId,
  kRaw: number,
  W: number,
  H: number,
) {
  const k = clamp(kRaw);
  const e = easeInOutCubic(k);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);

  switch (transition) {
    case "fade":
      ctx.globalAlpha = 1;
      ctx.drawImage(from, 0, 0);
      ctx.globalAlpha = e;
      ctx.drawImage(to, 0, 0);
      ctx.globalAlpha = 1;
      break;
    case "slide-up": {
      const s = easeOutQuint(k);
      ctx.drawImage(from, 0, -H * 0.22 * s);
      ctx.drawImage(to, 0, H * (1 - s));
      break;
    }
    case "slide-left": {
      const s = easeOutQuint(k);
      ctx.drawImage(from, -W * 0.22 * s, 0);
      ctx.drawImage(to, W * (1 - s), 0);
      break;
    }
    case "zoom": {
      const outScale = 1 + 0.14 * e;
      ctx.save();
      ctx.globalAlpha = 1 - e;
      ctx.translate(W / 2, H / 2);
      ctx.scale(outScale, outScale);
      ctx.drawImage(from, -W / 2, -H / 2);
      ctx.restore();
      const inScale = 1.12 - 0.12 * e;
      ctx.save();
      ctx.globalAlpha = e;
      ctx.translate(W / 2, H / 2);
      ctx.scale(inScale, inScale);
      ctx.drawImage(to, -W / 2, -H / 2);
      ctx.restore();
      ctx.globalAlpha = 1;
      break;
    }
    case "wipe": {
      ctx.drawImage(from, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, H * (1 - e), W, H * e);
      ctx.clip();
      ctx.drawImage(to, 0, 0);
      ctx.restore();
      break;
    }
    default:
      ctx.drawImage(to, 0, 0);
  }
}

export interface FrameOptions {
  images: Map<string, HTMLImageElement>;
  draft?: boolean;
  slices?: SceneSlice[];
}

/**
 * Berilgan vaqt uchun bitta kadrni kanvasga chizadi.
 * Kanvas o'lchami eksport/preview ixtiyorida — chizish har doim
 * virtual 1080-koordinatada bo'ladi.
 */
export function renderFrame(
  canvas: HTMLCanvasElement,
  project: Project,
  timeMs: number,
  opts: FrameOptions,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const slices = opts.slices ?? layoutScenes(project);
  const W = canvas.width;
  const H = canvas.height;
  const draft = opts.draft ?? false;

  if (!slices.length) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = project.brand.bg;
    ctx.fillRect(0, 0, W, H);
    return;
  }

  const cur = sliceAt(slices, timeMs)!;
  const local = clamp(timeMs, 0, slices[slices.length - 1].end) - cur.start;
  const prev = cur.index > 0 ? slices[cur.index - 1] : undefined;
  const transition = cur.scene.transition ?? "fade";
  const inTransition =
    !!prev && transition !== "none" && local < TRANSITION_MS && !draftSkipsTransitions(draft);

  const base: DrawSceneOptions = {
    images: opts.images,
    draft,
    noOutro: false,
    total: slices.length,
  };

  if (!inTransition) {
    const nextTransition = slices[cur.index + 1]?.scene.transition ?? "none";
    drawScene(ctx, project, cur, local, W, H, {
      ...base,
      noOutro: nextTransition !== "none" && nextTransition !== "fade",
    });
    return;
  }

  const a = scratchCanvas("a", W, H);
  const b = scratchCanvas("b", W, H);
  const actx = a.getContext("2d")!;
  const bctx = b.getContext("2d")!;

  drawScene(actx, project, prev!, Math.max(400, Number(prev!.scene.durationMs) || 3000), W, H, {
    ...base,
    noOutro: transition !== "fade",
  });
  drawScene(bctx, project, cur, local, W, H, { ...base, noOutro: true });
  composite(ctx, a, b, transition, local / TRANSITION_MS, W, H);
}

/** Juda past quvvatli qurilmalarda preview'da o'tishlarni tashlab ketish. */
function draftSkipsTransitions(_draft: boolean) {
  return false;
}

/** Sahna eskizini (thumbnail) chizadi. */
export function renderThumbnail(
  canvas: HTMLCanvasElement,
  project: Project,
  sceneIndex: number,
  images: Map<string, HTMLImageElement>,
) {
  const slices = layoutScenes(project);
  const slice = slices[sceneIndex];
  if (!slice) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawScene(
    ctx,
    project,
    slice,
    Math.min(slice.scene.durationMs * 0.72, slice.scene.durationMs - 350),
    canvas.width,
    canvas.height,
    { images, draft: true, noOutro: true, total: slices.length },
  );
}
