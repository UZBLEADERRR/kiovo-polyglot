import { useEffect, useRef, useState } from "react";
import type { AspectId, BackgroundStyle, Brand, Project } from "../types";
import { ASPECTS } from "../types";
import { THEMES } from "../lib/themes";
import { ColorField, Field, Segmented, Toggle } from "./ui";
import { ImagePicker } from "./ImagePicker";
import { getAsset, putAsset, uid } from "../lib/db";
import { fmtClock } from "../lib/project";
import { totalDuration } from "../render/engine";

const BACKGROUNDS: { value: BackgroundStyle; label: string }[] = [
  { value: "grid", label: "To'r" },
  { value: "glow", label: "Yorug'lik" },
  { value: "dots", label: "Nuqtalar" },
  { value: "rings", label: "Halqalar" },
  { value: "gradient", label: "Gradient" },
  { value: "plain", label: "Tekis" },
];

export function BrandPanel({
  project,
  imageUrls,
  onBrand,
}: {
  project: Project;
  imageUrls: Record<string, string>;
  onBrand: (patch: Partial<Brand>) => void;
}) {
  const [picking, setPicking] = useState(false);
  const brand = project.brand;
  const logoUrl = brand.logoAssetId ? imageUrls[brand.logoAssetId] : undefined;
  const activeTheme = THEMES.find(
    (t) => t.brand.accent === brand.accent && t.brand.bg === brand.bg,
  );

  return (
    <div className="stack">
      <Field label="Uslub">
        <div className="theme-row">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-card${activeTheme?.id === t.id ? " on" : ""}`}
              onClick={() => onBrand({ ...t.brand })}
            >
              <span className="preview">
                <i style={{ background: t.brand.bg }} />
                <i style={{ background: t.brand.accent }} />
                <i style={{ background: t.brand.accent2 }} />
              </span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </Field>

      <div className="row">
        <Field label="Brend nomi">
          <input
            className="input"
            value={brand.name}
            onChange={(e) => onBrand({ name: e.target.value })}
            placeholder="KIOVO"
          />
        </Field>
        <Field label="Username">
          <input
            className="input"
            value={brand.handle}
            onChange={(e) => onBrand({ handle: e.target.value })}
            placeholder="@kiovo"
          />
        </Field>
      </div>

      <Field label="Logo">
        <div className="thumb-pick">
          {logoUrl ? <img src={logoUrl} alt="" /> : <div className="placeholder">🏷</div>}
          <button className="btn btn-sm" onClick={() => setPicking(true)}>
            {brand.logoAssetId ? "Almashtirish" : "Logo tanlash"}
          </button>
          {brand.logoAssetId ? (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => onBrand({ logoAssetId: undefined })}
            >
              Olib tashlash
            </button>
          ) : null}
        </div>
      </Field>

      <Toggle
        label="Har bir sahnada brend tagi"
        value={brand.watermark}
        onChange={(v) => onBrand({ watermark: v })}
      />

      <Field label="Fon uslubi">
        <select
          className="select"
          value={brand.background}
          onChange={(e) => onBrand({ background: e.target.value as BackgroundStyle })}
        >
          {BACKGROUNDS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="divider" />
      <div className="hint">Ranglarni qo'lda sozlash</div>

      <Field label="Urg'u rangi">
        <ColorField value={brand.accent} onChange={(v) => onBrand({ accent: v })} />
      </Field>
      <Field label="Ikkinchi rang">
        <ColorField value={brand.accent2} onChange={(v) => onBrand({ accent2: v })} />
      </Field>
      <Field label="Fon">
        <ColorField value={brand.bg} onChange={(v) => onBrand({ bg: v })} />
      </Field>
      <Field label="Karta foni">
        <ColorField value={brand.surface} onChange={(v) => onBrand({ surface: v })} />
      </Field>
      <Field label="Matn">
        <ColorField value={brand.text} onChange={(v) => onBrand({ text: v })} />
      </Field>
      <Field label="Kul rang matn">
        <ColorField value={brand.muted} onChange={(v) => onBrand({ muted: v })} />
      </Field>

      {picking ? (
        <ImagePicker
          title="Logo tanlash"
          aspect={project.aspect}
          onClose={() => setPicking(false)}
          onPick={(id) => {
            onBrand({ logoAssetId: id ?? undefined });
            setPicking(false);
          }}
        />
      ) : null}
    </div>
  );
}

export function ProjectPanel({
  project,
  onProject,
}: {
  project: Project;
  onProject: (patch: Partial<Project>) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const duration = totalDuration(project);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    const id = project.audio?.assetId;
    if (!id) {
      setAudioUrl(null);
      return;
    }
    void getAsset(id).then((rec) => {
      if (!rec || cancelled) return;
      url = URL.createObjectURL(rec.blob);
      setAudioUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [project.audio?.assetId]);

  const onAudioFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const rec = await putAsset(file, file.name || `musiqa-${uid("a")}`, "audio");
      onProject({
        audio: {
          assetId: rec.id,
          name: rec.name,
          gain: 0.7,
          offsetMs: 0,
          fadeOutMs: 800,
        },
      });
    } catch (err) {
      console.error(err);
      alert("Audio faylni qo'shib bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <Field label="Format">
        <select
          className="select"
          value={project.aspect}
          onChange={(e) => onProject({ aspect: e.target.value as AspectId })}
        >
          {Object.values(ASPECTS).map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Kadr chastotasi" help="30 fps ijtimoiy tarmoqlar uchun optimal.">
        <Segmented
          value={String(project.fps)}
          options={[
            { value: "24", label: "24" },
            { value: "30", label: "30" },
            { value: "60", label: "60" },
          ]}
          onChange={(v) => onProject({ fps: Number(v) })}
        />
      </Field>

      <div className="note">
        Umumiy davomiylik: <strong>{fmtClock(duration)}</strong> · {project.scenes.length} ta sahna
      </div>

      <div className="divider" />
      <div className="hint">Musiqa</div>

      {project.audio ? (
        <div className="stack">
          <div className="note">🎵 {project.audio.name}</div>
          {audioUrl ? (
            <audio src={audioUrl} controls style={{ width: "100%" }} />
          ) : null}
          <Field label={`Ovoz balandligi — ${Math.round(project.audio.gain * 100)}%`}>
            <input
              type="range"
              min={0}
              max={150}
              value={Math.round(project.audio.gain * 100)}
              onChange={(e) =>
                onProject({
                  audio: { ...project.audio!, gain: Number(e.target.value) / 100 },
                })
              }
            />
          </Field>
          <Field label={`Boshlanish nuqtasi — ${fmtClock(project.audio.offsetMs)}`}>
            <input
              type="range"
              min={0}
              max={120000}
              step={500}
              value={project.audio.offsetMs}
              onChange={(e) =>
                onProject({
                  audio: { ...project.audio!, offsetMs: Number(e.target.value) },
                })
              }
            />
          </Field>
          <Toggle
            label="Oxirida ovoz so'nsin"
            value={project.audio.fadeOutMs > 0}
            onChange={(v) =>
              onProject({ audio: { ...project.audio!, fadeOutMs: v ? 800 : 0 } })
            }
          />
          <button
            className="btn btn-danger btn-block"
            onClick={() => onProject({ audio: undefined })}
          >
            Musiqani olib tashlash
          </button>
        </div>
      ) : (
        <button
          className="btn btn-block"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? <span className="spinner" /> : "🎵"} Musiqa qo'shish
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          void onAudioFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="hint">
        Musiqa faqat siz yuklagan fayldan olinadi. Ijtimoiy tarmoqlarda mualliflik huquqiga
        e'tibor bering.
      </div>
    </div>
  );
}
