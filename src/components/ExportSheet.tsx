import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "../types";
import { Field, Segmented, Sheet, Toggle } from "./ui";
import {
  canEncodeMp4,
  exportFrame,
  exportVideo,
  outputSize,
  type ExportProgress,
  type ExportResult,
} from "../lib/export";
import { saveFile, safeFilename } from "../lib/save";
import { fmtClock } from "../lib/project";
import { totalDuration } from "../render/engine";

interface Props {
  project: Project;
  images: Map<string, HTMLImageElement>;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export function ExportSheet({ project, images, onClose, onToast }: Props) {
  const [quality, setQuality] = useState<1080 | 720 | 480>(1080);
  const [fast, setFast] = useState<boolean | null>(null);
  const [withAudio, setWithAudio] = useState(true);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const duration = totalDuration(project);
  const size = outputSize(project, quality);

  // Qurilma H.264 ni uddalaydimi — real tekshiruv.
  useEffect(() => {
    let cancelled = false;
    void canEncodeMp4(project, quality, project.fps).then((ok) => {
      if (!cancelled) setFast(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [project, quality]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const estimate = useMemo(() => {
    if (fast === null) return "Qurilma imkoniyati tekshirilmoqda…";
    if (fast) return "Odatda video uzunligidan tezroq tayyor bo'ladi.";
    return `Bu qurilmada yozuv real vaqtda ketadi — taxminan ${fmtClock(duration)} vaqt oladi. Ilovani ochiq qoldiring.`;
  }, [fast, duration]);

  const run = async () => {
    setError(null);
    setResult(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setPreviewUrl(null);
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ phase: "prepare", value: 0, message: "Boshlanmoqda…" });
    try {
      const res = await exportVideo(
        project,
        images,
        { quality, fps: project.fps, withAudio: withAudio && !!project.audio },
        setProgress,
        controller.signal,
      );
      setResult(res);
      const url = URL.createObjectURL(res.blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setProgress(null);
    } catch (err) {
      setProgress(null);
      if ((err as DOMException)?.name === "AbortError") {
        setError("Eksport bekor qilindi.");
      } else {
        console.error(err);
        setError((err as Error)?.message ?? "Eksportda xato yuz berdi.");
      }
    } finally {
      abortRef.current = null;
    }
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const name = safeFilename(project.name, result.ext);
      const res = await saveFile(result.blob, name, project.name);
      onToast(res.message);
    } catch (err) {
      console.error(err);
      onToast("Faylni saqlab bo'lmadi.");
    } finally {
      setSaving(false);
    }
  };

  const savePoster = async () => {
    setSaving(true);
    try {
      const blob = await exportFrame(project, images, Math.min(1200, duration * 0.3));
      const res = await saveFile(blob, safeFilename(`${project.name}-muqova`, "png"), project.name);
      onToast(res.message);
    } catch (err) {
      console.error(err);
      onToast("Muqovani saqlab bo'lmadi.");
    } finally {
      setSaving(false);
    }
  };

  const busy = !!progress;

  return (
    <Sheet title="Eksport" onClose={busy ? () => abortRef.current?.abort() : onClose}>
      <Field label="Sifat">
        <Segmented
          value={String(quality)}
          options={[
            { value: "1080", label: "1080p" },
            { value: "720", label: "720p" },
            { value: "480", label: "480p" },
          ]}
          onChange={(v) => setQuality(Number(v) as 1080 | 720 | 480)}
        />
      </Field>

      <div className="note">
        {size.width}×{size.height} · {project.fps} fps · {fmtClock(duration)} ·{" "}
        {fast === null ? "tekshirilmoqda…" : fast ? "MP4 (H.264)" : "WebM (zaxira)"}
      </div>

      {project.audio ? (
        <Toggle label="Musiqa bilan" value={withAudio} onChange={setWithAudio} />
      ) : null}

      <div className={fast === false ? "note warn" : "note"}>{estimate}</div>

      {progress ? (
        <div className="stack">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.round(progress.value * 100)}%` }}
            />
          </div>
          <div className="hint">{progress.message}</div>
          <button className="btn btn-block" onClick={() => abortRef.current?.abort()}>
            Bekor qilish
          </button>
        </div>
      ) : null}

      {error ? <div className="note err">{error}</div> : null}

      {result && previewUrl ? (
        <div className="stack">
          <div className="note ok">
            Tayyor — {(result.blob.size / (1024 * 1024)).toFixed(1)} MB ·{" "}
            {result.ext.toUpperCase()}
          </div>
          {result.ext === "webm" ? (
            <div className="note warn">
              Bu qurilma MP4 kodlashni qo'llab-quvvatlamagani uchun video WebM formatida
              chiqdi. Ba'zi ilovalar (masalan Instagram) WebM'ni qabul qilmasligi mumkin —
              bunday holda videoni telefondagi biror konverter orqali MP4 ga o'giring.
            </div>
          ) : null}
          <video
            src={previewUrl}
            controls
            playsInline
            style={{
              width: "100%",
              borderRadius: 12,
              background: "#000",
              maxHeight: "42dvh",
            }}
          />
          <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : "⤓"} Saqlash / Ulashish
          </button>
        </div>
      ) : null}

      {!busy ? (
        <button className="btn btn-primary btn-block" onClick={run}>
          {result ? "Qaytadan eksport qilish" : "Videoni yaratish"}
        </button>
      ) : null}

      <button className="btn btn-block" onClick={savePoster} disabled={busy || saving}>
        🖼 Muqovani PNG sifatida saqlash
      </button>
    </Sheet>
  );
}
