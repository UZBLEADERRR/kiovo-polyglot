import { useEffect, useState } from "react";
import type { Project } from "../types";
import { collectImageIds } from "./project";
import { loadImages } from "./assets";

export interface LoadedImages {
  images: Map<string, HTMLImageElement>;
  /** UI kartalarida ko'rsatish uchun blob URL'lar. */
  urls: Record<string, string>;
}

const EMPTY: LoadedImages = { images: new Map(), urls: {} };

/** Loyihada ishlatilgan barcha rasmlarni yuklab, keshda saqlaydi. */
export function useImages(project: Project): LoadedImages {
  const [state, setState] = useState<LoadedImages>(EMPTY);
  const key = collectImageIds(project).join("|");

  useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split("|") : [];
    void loadImages(ids).then((images) => {
      if (cancelled) return;
      const urls: Record<string, string> = {};
      images.forEach((img, id) => {
        urls[id] = img.src;
      });
      setState({ images, urls });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return state;
}
