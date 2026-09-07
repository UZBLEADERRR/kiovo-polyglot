import { useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "./types";
import { Home } from "./components/Home";
import { Editor } from "./components/Editor";
import { duplicateProject, loadProjects, saveProjects } from "./lib/project";

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  // O'zgarishlarni brauzer xotirasiga saqlaymiz.
  useEffect(() => {
    const t = window.setTimeout(() => saveProjects(projects), 250);
    return () => window.clearTimeout(t);
  }, [projects]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const create = (project: Project) => {
    setProjects((prev) => [project, ...prev]);
    setOpenId(project.id);
  };

  const update = useCallback((next: Project) => {
    setProjects((prev) => prev.map((p) => (p.id === next.id ? next : p)));
  }, []);

  const remove = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (openId === id) setOpenId(null);
  };

  const duplicate = (id: string) => {
    const src = projects.find((p) => p.id === id);
    if (!src) return;
    setProjects((prev) => [duplicateProject(src), ...prev]);
    showToast("Nusxa yaratildi.");
  };

  const current = projects.find((p) => p.id === openId) ?? null;

  return (
    <>
      {current ? (
        <Editor
          project={current}
          onChange={update}
          onBack={() => setOpenId(null)}
          onToast={showToast}
        />
      ) : (
        <Home
          projects={projects}
          onOpen={setOpenId}
          onCreate={create}
          onDelete={remove}
          onDuplicate={duplicate}
        />
      )}
      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
