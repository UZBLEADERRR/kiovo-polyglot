export type AspectId = "9:16" | "4:5" | "1:1" | "16:9";

export interface AspectDef {
  id: AspectId;
  label: string;
  /** Virtual chizish maydoni (barcha shablonlar shu koordinatada chiziladi). */
  w: number;
  h: number;
}

export const ASPECTS: Record<AspectId, AspectDef> = {
  "9:16": { id: "9:16", label: "9:16 · Reels / Shorts", w: 1080, h: 1920 },
  "4:5": { id: "4:5", label: "4:5 · Feed post", w: 1080, h: 1350 },
  "1:1": { id: "1:1", label: "1:1 · Kvadrat", w: 1080, h: 1080 },
  "16:9": { id: "16:9", label: "16:9 · YouTube", w: 1920, h: 1080 },
};

export type BackgroundStyle = "grid" | "glow" | "dots" | "rings" | "plain" | "gradient";

export interface Brand {
  /** Brend nomi — outro va watermarkda ishlatiladi. */
  name: string;
  handle: string;
  /** Asosiy urg'u rangi. */
  accent: string;
  /** Ikkilamchi urg'u (grafik, ikkinchi ustun). */
  accent2: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  background: BackgroundStyle;
  /** IndexedDB'dagi logo rasm id'si. */
  logoAssetId?: string;
  /** Har bir sahnada pastda brend tagi ko'rsatilsinmi. */
  watermark: boolean;
}

export type TransitionId = "none" | "fade" | "slide-up" | "slide-left" | "zoom" | "wipe";

export interface Scene {
  id: string;
  template: string;
  durationMs: number;
  transition: TransitionId;
  data: Record<string, unknown>;
}

export interface AudioTrack {
  assetId: string;
  name: string;
  gain: number;
  /** Audioning qaysi sekundidan boshlab olinadi. */
  offsetMs: number;
  fadeOutMs: number;
}

export interface Project {
  id: string;
  name: string;
  aspect: AspectId;
  fps: number;
  brand: Brand;
  scenes: Scene[];
  audio?: AudioTrack;
  createdAt: number;
  updatedAt: number;
}

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "image"
  | "list"
  | "select"
  | "toggle"
  | "color";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  /** list turi uchun: maksimal element soni. */
  maxItems?: number;
  options?: { value: string; label: string }[];
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  /** Virtual kenglik/balandlik (ASPECTS dan). */
  W: number;
  H: number;
  /** Sahna boshidan o'tgan vaqt, ms. */
  t: number;
  /** Sahna davomiyligi, ms. */
  dur: number;
  /** t / dur, 0..1 */
  p: number;
  brand: Brand;
  data: Record<string, unknown>;
  images: Map<string, HTMLImageElement>;
  /** Sahna indeksi (raqamli kicker uchun). */
  index: number;
  total: number;
  /** Preview'da true — og'ir effektlar soddalashtiriladi. */
  draft: boolean;
  /** Keyingi sahnaga o'tish effekti bor — sahna o'z so'nishini qo'llamaydi. */
  noOutro?: boolean;
}

export interface TemplateDef {
  id: string;
  name: string;
  group: "Matn" | "Ma'lumot" | "Media" | "Yakun";
  /** Ro'yxatdagi kichik belgisi. */
  emoji: string;
  defaultDurationMs: number;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
  draw: (rc: RenderContext) => void;
}
