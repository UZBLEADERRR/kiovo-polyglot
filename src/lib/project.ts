import { getTemplate, TEMPLATES } from "../render/templates";
import type { AspectId, Brand, Project, Scene, TransitionId } from "../types";
import { uid } from "./db";
import { THEMES } from "./themes";

const STORAGE_KEY = "kiovo.reels.projects.v1";

export function defaultBrand(): Brand {
  return {
    name: "KIOVO",
    handle: "@kiovo",
    watermark: true,
    ...THEMES[0].brand,
  };
}

export function makeScene(templateId: string, overrides: Partial<Scene> = {}): Scene {
  const tpl = getTemplate(templateId);
  return {
    id: uid("sc"),
    template: tpl.id,
    transition: "slide-up",
    data: structuredClone(tpl.defaults),
    ...overrides,
    // Noto'g'ri yoki berilmagan qiymat vaqt jadvalini buzmasligi uchun.
    durationMs: Math.max(400, Number(overrides.durationMs) || tpl.defaultDurationMs),
  };
}

export function makeProject(name: string, scenes: Scene[] = [], aspect: AspectId = "9:16"): Project {
  const now = Date.now();
  return {
    id: uid("prj"),
    name,
    aspect,
    fps: 30,
    brand: defaultBrand(),
    scenes: scenes.length ? scenes : [makeScene("hook"), makeScene("outro")],
    createdAt: now,
    updatedAt: now,
  };
}

/** localStorage'dagi barcha loyihalar (eng yangisi birinchi). */
export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrate).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error("Loyihalarni saqlab bo'lmadi", err);
  }
}

/** Eski formatdagi loyihalarga yetishmayotgan maydonlarni to'ldiradi. */
function migrate(p: Project): Project {
  const brand = { ...defaultBrand(), ...(p.brand ?? {}) };
  return {
    ...p,
    fps: p.fps || 30,
    aspect: p.aspect ?? "9:16",
    brand,
    scenes: (p.scenes ?? []).map((s) => {
      const tpl = getTemplate(s.template);
      return {
        ...s,
        transition: (s.transition ?? "slide-up") as TransitionId,
        durationMs: Math.max(400, s.durationMs || tpl.defaultDurationMs),
        data: { ...structuredClone(tpl.defaults), ...(s.data ?? {}) },
      };
    }),
  };
}

export function duplicateProject(p: Project): Project {
  const copy = structuredClone(p);
  copy.id = uid("prj");
  copy.name = `${p.name} (nusxa)`;
  copy.createdAt = Date.now();
  copy.updatedAt = Date.now();
  copy.scenes = copy.scenes.map((s) => ({ ...s, id: uid("sc") }));
  return copy;
}

/** Loyihada ishlatilgan barcha rasm id'lari. */
export function collectImageIds(project: Project): string[] {
  const ids: string[] = [];
  if (project.brand.logoAssetId) ids.push(project.brand.logoAssetId);
  for (const scene of project.scenes) {
    const tpl = getTemplate(scene.template);
    for (const field of tpl.fields) {
      if (field.type !== "image") continue;
      const v = scene.data[field.key];
      if (typeof v === "string" && v) ids.push(v);
    }
  }
  return [...new Set(ids)];
}

export const TEMPLATE_GROUPS = ["Matn", "Ma'lumot", "Media", "Yakun"] as const;

export function templatesByGroup() {
  return TEMPLATE_GROUPS.map((group) => ({
    group,
    items: TEMPLATES.filter((t) => t.group === group),
  }));
}

export function fmtDuration(ms: number): string {
  const total = Math.round(ms / 100) / 10;
  return `${total.toFixed(1)}s`;
}

export function fmtClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
