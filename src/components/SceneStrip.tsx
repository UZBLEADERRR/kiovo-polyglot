import { useEffect, useRef } from "react";
import { ASPECTS, type Project } from "../types";
import { renderThumbnail } from "../render/engine";
import { fmtDuration } from "../lib/project";

function Thumb({
  project,
  index,
  images,
}: {
  project: Project;
  index: number;
  images: Map<string, HTMLImageElement>;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const aspect = ASPECTS[project.aspect];
  const w = 108;
  const h = Math.round((w * aspect.h) / aspect.w);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    renderThumbnail(canvas, project, index, images);
  }, [project, index, images, w, h]);

  return <canvas ref={ref} style={{ aspectRatio: `${aspect.w} / ${aspect.h}` }} />;
}

export function SceneStrip({
  project,
  images,
  activeIndex,
  onSelect,
  onAdd,
}: {
  project: Project;
  images: Map<string, HTMLImageElement>;
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
}) {
  const stripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeIndex]);

  return (
    <div className="strip" ref={stripRef}>
      {project.scenes.map((scene, i) => (
        <button
          key={scene.id}
          className={`strip-item${i === activeIndex ? " active" : ""}`}
          onClick={() => onSelect(i)}
          aria-label={`${i + 1}-sahna`}
        >
          <Thumb project={project} index={i} images={images} />
          <span className="idx">{i + 1}</span>
          <span className="dur">{fmtDuration(scene.durationMs)}</span>
        </button>
      ))}
      <button className="strip-add" onClick={onAdd} aria-label="Sahna qo'shish">
        +
      </button>
    </div>
  );
}
