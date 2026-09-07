import type { TemplateDef } from "../../types";
import { bulletsTemplate, hookTemplate, quoteTemplate, statementTemplate } from "./text";
import { chartTemplate, compareTemplate, statTemplate, stepsTemplate } from "./data";
import { codeTemplate, imageTemplate } from "./media";
import { cutoutTemplate } from "./cutout";
import { outroTemplate } from "./outro";

export const TEMPLATES: TemplateDef[] = [
  hookTemplate,
  statementTemplate,
  bulletsTemplate,
  statTemplate,
  chartTemplate,
  compareTemplate,
  stepsTemplate,
  imageTemplate,
  cutoutTemplate,
  codeTemplate,
  quoteTemplate,
  outroTemplate,
];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): TemplateDef {
  return BY_ID.get(id) ?? hookTemplate;
}

/** Sahnadagi rasm maydonlarining qiymatlari — yuklash uchun. */
export function imageKeysOf(template: TemplateDef): string[] {
  return template.fields.filter((f) => f.type === "image").map((f) => f.key);
}
