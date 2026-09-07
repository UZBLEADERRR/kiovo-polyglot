import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { ASPECTS, type Project } from "../types";
import { layoutScenes, renderFrame, totalDuration } from "../render/engine";

export interface PlayerHandle {
  seek: (ms: number) => void;
  time: () => number;
  redraw: () => void;
  canvas: () => HTMLCanvasElement | null;
}

interface Props {
  project: Project;
  images: Map<string, HTMLImageElement>;
  playing: boolean;
  onPlayingChange: (v: boolean) => void;
  onTimeUpdate: (ms: number) => void;
  /** Preview balandligi (CSS piksel). */
  maxHeight?: number;
}

const MAX_BACKING_HEIGHT = 1080;

export const Player = forwardRef<PlayerHandle, Props>(function Player(
  { project, images, playing, onPlayingChange, onTimeUpdate, maxHeight },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(0);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const lastReportRef = useRef(0);

  const projectRef = useRef(project);
  projectRef.current = project;
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width) return;
    const p = projectRef.current;
    renderFrame(canvas, p, timeRef.current, {
      images: imagesRef.current,
      draft: true,
      slices: layoutScenes(p),
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      seek(ms) {
        const total = totalDuration(projectRef.current);
        timeRef.current = Math.max(0, Math.min(ms, Math.max(0, total - 1)));
        onTimeUpdate(timeRef.current);
        draw();
      },
      time: () => timeRef.current,
      redraw: draw,
      canvas: () => canvasRef.current,
    }),
    [draw, onTimeUpdate],
  );

  // Kanvas o'lchamini konteynerga moslash.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let h = Math.round(rect.height * dpr);
      let w = Math.round(rect.width * dpr);
      if (h > MAX_BACKING_HEIGHT) {
        const k = MAX_BACKING_HEIGHT / h;
        h = MAX_BACKING_HEIGHT;
        w = Math.round(w * k);
      }
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = Math.max(2, w);
        canvas.height = Math.max(2, h);
        draw();
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    window.addEventListener("orientationchange", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", resize);
    };
  }, [draw, project.aspect]);

  // Tahrir qilinganda qayta chizish.
  useEffect(() => {
    if (!playing) draw();
  }, [project, images, playing, draw]);

  // Ijro sikli.
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const total = totalDuration(projectRef.current);
    if (timeRef.current >= total - 20) timeRef.current = 0;
    lastTsRef.current = performance.now();

    const tick = (ts: number) => {
      const dt = Math.min(120, ts - lastTsRef.current);
      lastTsRef.current = ts;
      timeRef.current += dt;
      const end = totalDuration(projectRef.current);
      if (timeRef.current >= end) {
        timeRef.current = end - 1;
        draw();
        onTimeUpdate(timeRef.current);
        onPlayingChange(false);
        return;
      }
      draw();
      if (ts - lastReportRef.current > 90) {
        lastReportRef.current = ts;
        onTimeUpdate(timeRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, draw, onPlayingChange, onTimeUpdate]);

  const aspect = ASPECTS[project.aspect];

  return (
    <div
      className="stage-canvas-wrap"
      ref={wrapRef}
      style={{
        aspectRatio: `${aspect.w} / ${aspect.h}`,
        height: maxHeight ? `${maxHeight}px` : "min(44dvh, 480px)",
        maxWidth: "100%",
      }}
    >
      <canvas ref={canvasRef} />
      <button
        className="stage-tap"
        onClick={() => onPlayingChange(!playing)}
        aria-label={playing ? "To'xtatish" : "Ijro etish"}
      >
        <span className={`play-badge${playing ? " hidden" : ""}`}>{playing ? "❚❚" : "▶"}</span>
      </button>
    </div>
  );
});
