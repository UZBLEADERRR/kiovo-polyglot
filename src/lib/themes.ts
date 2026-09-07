import type { Brand } from "../types";

export interface ThemePreset {
  id: string;
  name: string;
  brand: Omit<Brand, "name" | "handle" | "logoAssetId" | "watermark">;
}

export const THEMES: ThemePreset[] = [
  {
    id: "terminal",
    name: "Terminal",
    brand: {
      accent: "#7cf03d",
      accent2: "#4aa8ff",
      bg: "#07090d",
      surface: "#101720",
      text: "#ffffff",
      muted: "#8b95a5",
      background: "grid",
    },
  },
  {
    id: "midnight",
    name: "Yarim tun",
    brand: {
      accent: "#7c8cff",
      accent2: "#c084fc",
      bg: "#05060f",
      surface: "#111428",
      text: "#f5f6ff",
      muted: "#8c92b8",
      background: "glow",
    },
  },
  {
    id: "neon",
    name: "Neon",
    brand: {
      accent: "#ff2ea6",
      accent2: "#22e3ff",
      bg: "#0a0210",
      surface: "#1a0a24",
      text: "#ffffff",
      muted: "#b18ac4",
      background: "glow",
    },
  },
  {
    id: "sunrise",
    name: "Quyosh",
    brand: {
      accent: "#ff8a3d",
      accent2: "#ffd166",
      bg: "#140a05",
      surface: "#241408",
      text: "#fff6ee",
      muted: "#b39178",
      background: "rings",
    },
  },
  {
    id: "mint",
    name: "Yalpiz",
    brand: {
      accent: "#2ee6a8",
      accent2: "#6ee7ff",
      bg: "#04120e",
      surface: "#0c2119",
      text: "#eefff8",
      muted: "#7fae9d",
      background: "dots",
    },
  },
  {
    id: "paper",
    name: "Oq qog'oz",
    brand: {
      accent: "#e2483d",
      accent2: "#2f6fed",
      bg: "#f5f2ec",
      surface: "#ffffff",
      text: "#14140f",
      muted: "#6d6a62",
      background: "plain",
    },
  },
  {
    id: "ink",
    name: "Siyoh",
    brand: {
      accent: "#ffd60a",
      accent2: "#8ecae6",
      bg: "#0b0b0b",
      surface: "#171717",
      text: "#fafafa",
      muted: "#9a9a9a",
      background: "dots",
    },
  },
];

export function themeById(id: string): ThemePreset {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
