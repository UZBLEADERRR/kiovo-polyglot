import { useEffect, useRef, useState } from "react";
import { ASPECTS, type Project } from "../types";
import { STORYBOARDS, projectFromStoryboard } from "../lib/storyboards";
import { fmtClock, makeProject } from "../lib/project";
import { renderThumbnail, totalDuration } from "../render/engine";
import { useImages } from "../lib/useImages";
import { Sheet } from "./ui";

function ProjectThumb({ project }: { project: Project }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { images } = useImages(project);
  const aspect = ASPECTS[project.aspect];

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = 92;
    canvas.height = Math.round((92 * aspect.h) / aspect.w);
    renderThumbnail(canvas, project, 0, images);
  }, [project, images, aspect]);

  return <canvas ref={ref} className="project-thumb" />;
}

interface Props {
  projects: Project[];
  onOpen: (id: string) => void;
  onCreate: (project: Project) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function Home({ projects, onOpen, onCreate, onDelete, onDuplicate }: Props) {
  const [menuFor, setMenuFor] = useState<Project | null>(null);

  return (
    <div className="app">
      <div className="topbar">
        <h1>Kiovo Reels</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onCreate(makeProject("Yangi video"))}
        >
          + Yangi
        </button>
      </div>

      <div className="scroll">
        <div className="home-hero">
          <div className="eyebrow">TELEFONDA VIDEO STUDIYA</div>
          <h2>Brendingiz uchun animatsion videolar</h2>
          <p>Tayyor ssenariy tanlang, matnni o'zgartiring va MP4 qilib eksport qiling.</p>
        </div>

        <div className="section">
          <div className="section-title">
            <h3>Tayyor ssenariylar</h3>
          </div>
          <div className="card-grid">
            {STORYBOARDS.map((sb) => (
              <button
                key={sb.id}
                className="story-card"
                onClick={() => onCreate(projectFromStoryboard(sb))}
              >
                <strong>{sb.name}</strong>
                <span>{sb.description}</span>
                <div className="chips">
                  <span className="chip">{sb.scenes.length} sahna</span>
                  <span className="chip">9:16</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="section" style={{ paddingBottom: 28 }}>
          <div className="section-title">
            <h3>Loyihalarim</h3>
            <span className="hint">{projects.length}</span>
          </div>
          {projects.length === 0 ? (
            <div className="empty">
              Hali loyiha yo'q. Yuqoridagi ssenariylardan birini tanlang.
            </div>
          ) : (
            projects.map((p) => (
              <div key={p.id} style={{ position: "relative" }}>
                <button className="project-row" onClick={() => onOpen(p.id)}>
                  <ProjectThumb project={p} />
                  <span className="meta">
                    <strong>{p.name}</strong>
                    <span>
                      {p.scenes.length} sahna · {fmtClock(totalDuration(p))} · {p.aspect}
                    </span>
                  </span>
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}
                  onClick={() => setMenuFor(p)}
                  aria-label="Amallar"
                >
                  ⋯
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {menuFor ? (
        <Sheet title={menuFor.name} onClose={() => setMenuFor(null)}>
          <button
            className="btn btn-block"
            onClick={() => {
              onDuplicate(menuFor.id);
              setMenuFor(null);
            }}
          >
            ⧉ Nusxa yaratish
          </button>
          <button
            className="btn btn-block btn-danger"
            onClick={() => {
              if (confirm(`"${menuFor.name}" o'chirilsinmi?`)) {
                onDelete(menuFor.id);
                setMenuFor(null);
              }
            }}
          >
            🗑 O'chirish
          </button>
        </Sheet>
      ) : null}
    </div>
  );
}
