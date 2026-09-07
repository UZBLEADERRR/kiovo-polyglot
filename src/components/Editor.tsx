import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Project, Scene } from "../types";
import { Player, type PlayerHandle } from "./Player";
import { SceneStrip } from "./SceneStrip";
import { SceneEditor, TemplatePicker } from "./SceneEditor";
import { BrandPanel, ProjectPanel } from "./Panels";
import { ExportSheet } from "./ExportSheet";
import { useImages } from "../lib/useImages";
import { makeScene, fmtClock } from "../lib/project";
import { layoutScenes, totalDuration, TRANSITION_MS } from "../render/engine";
import { uid } from "../lib/db";

type Tab = "scene" | "brand" | "project";

interface Props {
  project: Project;
  onChange: (project: Project) => void;
  onBack: () => void;
  onToast: (msg: string) => void;
}

export function Editor({ project, onChange, onBack, onToast }: Props) {
  const [tab, setTab] = useState<Tab>("scene");
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const playerRef = useRef<PlayerHandle | null>(null);
  const { images, urls } = useImages(project);

  const slices = useMemo(() => layoutScenes(project), [project]);
  const duration = totalDuration(project);
  const index = Math.min(activeIndex, Math.max(0, project.scenes.length - 1));
  const scene = project.scenes[index];

  const patch = useCallback(
    (p: Partial<Project>) => onChange({ ...project, ...p, updatedAt: Date.now() }),
    [project, onChange],
  );

  const patchScene = useCallback(
    (i: number, p: Partial<Scene>) => {
      const scenes = project.scenes.map((s, j) => (j === i ? { ...s, ...p } : s));
      patch({ scenes });
    },
    [project.scenes, patch],
  );

  const patchData = useCallback(
    (key: string, value: unknown) => {
      const scenes = project.scenes.map((s, j) =>
        j === index ? { ...s, data: { ...s.data, [key]: value } } : s,
      );
      patch({ scenes });
    },
    [project.scenes, index, patch],
  );

  // Ochilganda t=0 da hech narsa ko'rinmaydi (animatsiyalar hali boshlanmagan),
  // shuning uchun birinchi sahnaning o'rtasiga o'tamiz.
  useEffect(() => {
    const first = slices[0];
    if (first) playerRef.current?.seek(first.start + (first.end - first.start) * 0.65);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const seekToScene = useCallback(
    (i: number) => {
      setActiveIndex(i);
      const slice = slices[i];
      if (!slice) return;
      // Sahna boshida o'tish effekti va animatsiyalar hali tugamagan bo'ladi —
      // shuning uchun mazmun ko'rinadigan nuqtaga o'tamiz.
      const dur = slice.end - slice.start;
      const offset = Math.min(dur * 0.6, Math.max(TRANSITION_MS + 250, dur * 0.45));
      playerRef.current?.seek(slice.start + offset);
    },
    [slices],
  );

  // Ijro paytida bu funksiya sekundiga bir necha marta chaqiriladi —
  // uning o'zgarishi rAF siklini qayta ishga tushirmasligi kerak.
  const slicesRef = useRef(slices);
  slicesRef.current = slices;
  const onTimeUpdate = useCallback((ms: number) => {
    setTimeMs(ms);
    const slice = slicesRef.current.find((s) => ms >= s.start && ms < s.end);
    if (slice) setActiveIndex((prev) => (prev === slice.index ? prev : slice.index));
  }, []);

  const addScene = (templateId: string) => {
    const scene = makeScene(templateId);
    const scenes = [...project.scenes];
    scenes.splice(index + 1, 0, scene);
    patch({ scenes });
    setAddOpen(false);
    setTimeout(() => seekToScene(index + 1), 0);
  };

  const moveScene = (dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= project.scenes.length) return;
    const scenes = [...project.scenes];
    const [item] = scenes.splice(index, 1);
    scenes.splice(target, 0, item);
    patch({ scenes });
    setActiveIndex(target);
  };

  const duplicateScene = () => {
    const scenes = [...project.scenes];
    scenes.splice(index + 1, 0, { ...structuredClone(scenes[index]), id: uid("sc") });
    patch({ scenes });
    setActiveIndex(index + 1);
  };

  const deleteScene = () => {
    if (project.scenes.length <= 1) return;
    const scenes = project.scenes.filter((_, j) => j !== index);
    patch({ scenes });
    setActiveIndex(Math.max(0, index - 1));
  };

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn btn-ghost btn-icon" onClick={onBack} aria-label="Orqaga">
          ←
        </button>
        <input
          className="title-input"
          value={project.name}
          onChange={(e) => patch({ name: e.target.value })}
          aria-label="Loyiha nomi"
        />
        <button className="btn btn-primary btn-sm" onClick={() => setExportOpen(true)}>
          Eksport
        </button>
      </div>

      <div className="stage">
        <Player
          ref={playerRef}
          project={project}
          images={images}
          playing={playing}
          onPlayingChange={setPlaying}
          onTimeUpdate={onTimeUpdate}
        />
        <div className="transport">
          <button
            className="btn btn-icon"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? "To'xtatish" : "Ijro"}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(1, duration - 1)}
            value={Math.min(timeMs, duration - 1)}
            onChange={(e) => {
              setPlaying(false);
              playerRef.current?.seek(Number(e.target.value));
            }}
            aria-label="Vaqt"
          />
          <span className="time mono">
            {fmtClock(timeMs)} / {fmtClock(duration)}
          </span>
        </div>
      </div>

      <SceneStrip
        project={project}
        images={images}
        activeIndex={index}
        onSelect={(i) => {
          setPlaying(false);
          seekToScene(i);
          setTab("scene");
        }}
        onAdd={() => setAddOpen(true)}
      />

      <div className="tabs">
        <button
          className={`tab${tab === "scene" ? " active" : ""}`}
          onClick={() => setTab("scene")}
        >
          Sahna
        </button>
        <button
          className={`tab${tab === "brand" ? " active" : ""}`}
          onClick={() => setTab("brand")}
        >
          Brend
        </button>
        <button
          className={`tab${tab === "project" ? " active" : ""}`}
          onClick={() => setTab("project")}
        >
          Loyiha
        </button>
      </div>

      <div className="scroll">
        <div className="panel">
          {tab === "scene" && scene ? (
            <SceneEditor
              scene={scene}
              index={index}
              total={project.scenes.length}
              aspect={project.aspect}
              imageUrls={urls}
              onChange={(p) => patchScene(index, p)}
              onData={patchData}
              onMove={moveScene}
              onDuplicate={duplicateScene}
              onDelete={deleteScene}
            />
          ) : null}
          {tab === "brand" ? (
            <BrandPanel
              project={project}
              imageUrls={urls}
              onBrand={(p) => patch({ brand: { ...project.brand, ...p } })}
            />
          ) : null}
          {tab === "project" ? <ProjectPanel project={project} onProject={patch} /> : null}
        </div>
      </div>

      {addOpen ? (
        <TemplatePicker current="" onPick={addScene} onClose={() => setAddOpen(false)} />
      ) : null}

      {exportOpen ? (
        <ExportSheet
          project={project}
          images={images}
          onClose={() => setExportOpen(false)}
          onToast={onToast}
        />
      ) : null}
    </div>
  );
}
