export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeOutQuint = (x: number) => 1 - Math.pow(1 - x, 5);
export const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const linear = (x: number) => x;

export type Easing = (x: number) => number;

export const EASINGS = {
  linear,
  easeOutCubic,
  easeOutQuint,
  easeInOutCubic,
  easeOutExpo,
  easeOutBack,
};

/**
 * `t` (ms) vaqtida `delay` dan keyin `dur` davomida ketadigan
 * animatsiyaning 0..1 qiymatini qaytaradi.
 */
export function anim(t: number, delay: number, dur: number, ease: Easing = easeOutCubic): number {
  if (dur <= 0) return t >= delay ? 1 : 0;
  return ease(clamp((t - delay) / dur));
}

/** Sahna oxirida chiqib ketish uchun: 1 -> 0. */
export function outro(t: number, dur: number, tail = 320, ease: Easing = easeOutCubic): number {
  const start = dur - tail;
  if (t <= start) return 1;
  return 1 - ease(clamp((t - start) / tail));
}

/** Ketma-ket elementlar uchun kechikish. */
export const stagger = (i: number, step: number, base = 0) => base + i * step;

export const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/** Deterministik "tasodifiy" son — eksport har safar bir xil chiqishi uchun. */
export function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
