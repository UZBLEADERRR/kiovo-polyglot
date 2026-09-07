import { useEffect, useRef, useState } from "react";
import { Field, Segmented, Sheet, Toggle } from "./ui";
import {
  DEFAULT_MODEL,
  GeminiError,
  generateImage,
  getApiKey,
  getModel,
  hasApiKey,
  setApiKey,
  setModel,
  type GeminiAspect,
} from "../lib/gemini";
import { CUTOUT_PROMPT_SUFFIX, removeBackground } from "../lib/cutout";
import { getAsset, putAsset, type AssetRecord } from "../lib/db";
import type { AspectId } from "../types";

/** Tez boshlash uchun tayyor uslublar. */
const STYLES: { id: string; label: string; text: string }[] = [
  {
    id: "product",
    label: "Mahsulot fotosi",
    text: "professional studio product photograph, soft lighting, clean composition, high detail",
  },
  {
    id: "3d",
    label: "3D ikonka",
    text: "glossy 3D rendered icon, soft studio lighting, subtle gradient, clean edges",
  },
  {
    id: "illustration",
    label: "Illyustratsiya",
    text: "flat vector illustration, bold shapes, limited color palette, modern editorial style",
  },
  {
    id: "background",
    label: "Fon rasmi",
    text: "abstract dark background, subtle gradient mesh, cinematic depth, no text",
  },
  {
    id: "photo",
    label: "Hayotiy kadr",
    text: "candid lifestyle photograph, natural light, shallow depth of field",
  },
];

const ASPECT_MAP: Record<AspectId, GeminiAspect> = {
  "9:16": "9:16",
  "4:5": "4:5",
  "1:1": "1:1",
  "16:9": "16:9",
};

interface Props {
  /** Loyiha formati — sukut bo'yicha shu nisbat so'raladi. */
  projectAspect: AspectId;
  onClose: () => void;
  onCreated: (assetId: string) => void;
}

export function AiSheet({ projectAspect, onClose, onCreated }: Props) {
  const [keyInput, setKeyInput] = useState(getApiKey());
  const [showKey, setShowKey] = useState(false);
  const [editingKey, setEditingKey] = useState(!hasApiKey());
  const [modelInput, setModelInput] = useState(getModel());

  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string>("product");
  const [aspect, setAspect] = useState<"auto" | GeminiAspect>(ASPECT_MAP[projectAspect]);
  const [cutout, setCutout] = useState(false);
  const [sourceId, setSourceId] = useState<string>("");
  const [sources, setSources] = useState<AssetRecord[]>([]);
  const [sourceUrls, setSourceUrls] = useState<Record<string, string>>({});

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const resultBlob = useRef<Blob | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const createdUrls = useRef<string[]>([]);

  useEffect(() => {
    let alive = true;
    void import("../lib/db").then(async ({ listAssets }) => {
      const all = (await listAssets()).filter((a) => a.kind === "image").slice(0, 12);
      if (!alive) return;
      const urls: Record<string, string> = {};
      for (const a of all) {
        const u = URL.createObjectURL(a.blob);
        createdUrls.current.push(u);
        urls[a.id] = u;
      }
      setSources(all);
      setSourceUrls(urls);
    });
    return () => {
      alive = false;
      for (const u of createdUrls.current) URL.revokeObjectURL(u);
      createdUrls.current = [];
      abortRef.current?.abort();
    };
  }, []);

  const saveKey = () => {
    setApiKey(keyInput);
    setModel(modelInput);
    setEditingKey(false);
    setError(null);
  };

  const run = async () => {
    const text = prompt.trim();
    if (!text) {
      setError("Avval nima chizilishini yozing.");
      return;
    }
    setError(null);
    setBusy(true);
    setStatus("Gemini rasm yaratmoqda…");
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    resultBlob.current = null;

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const stylePart = STYLES.find((s) => s.id === style)?.text ?? "";
      const full = [text, stylePart].filter(Boolean).join(". ") + (cutout ? CUTOUT_PROMPT_SUFFIX : "");
      const source = sourceId ? await getAsset(sourceId) : undefined;

      let blob = await generateImage({
        prompt: full,
        images: source ? [source.blob] : undefined,
        aspectRatio: aspect === "auto" ? undefined : aspect,
        signal: controller.signal,
      });

      if (cutout) {
        setStatus("Fon olib tashlanmoqda…");
        blob = await removeBackground(blob, { tolerance: 46 });
      }

      resultBlob.current = blob;
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setStatus(null);
    } catch (err) {
      setStatus(null);
      if ((err as DOMException)?.name === "AbortError") {
        setError("Bekor qilindi.");
      } else if (err instanceof GeminiError) {
        setError(err.message);
      } else {
        console.error(err);
        setError("Rasm yaratilmadi. Internetni tekshirib, qayta urinib ko'ring.");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const keep = async () => {
    const blob = resultBlob.current;
    if (!blob) return;
    setBusy(true);
    try {
      const name = prompt.trim().slice(0, 40) || "AI rasm";
      const rec = await putAsset(blob, name, "image");
      onCreated(rec.id);
    } catch (err) {
      console.error(err);
      setError("Rasmni saqlab bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  if (editingKey) {
    return (
      <Sheet title="Gemini kaliti" onClose={onClose}>
        <div className="note">
          Rasm yaratish uchun Google AI Studio'dan olingan bepul Gemini API kaliti kerak.
          Kalit faqat shu telefonda saqlanadi va so'rovlar to'g'ridan-to'g'ri Google'ga ketadi.
        </div>
        <Field label="API kalit" help="aistudio.google.com/apikey sahifasidan olinadi.">
          <input
            className="input mono"
            type={showKey ? "text" : "password"}
            value={keyInput}
            spellCheck={false}
            autoComplete="off"
            placeholder="AIza..."
            onChange={(e) => setKeyInput(e.target.value)}
          />
        </Field>
        <Toggle label="Kalitni ko'rsatish" value={showKey} onChange={setShowKey} />
        <Field label="Model" help={`Sukut bo'yicha ${DEFAULT_MODEL}.`}>
          <input
            className="input mono"
            value={modelInput}
            spellCheck={false}
            onChange={(e) => setModelInput(e.target.value)}
          />
        </Field>
        {error ? <div className="note err">{error}</div> : null}
        <button
          className="btn btn-primary btn-block"
          onClick={saveKey}
          disabled={keyInput.trim().length < 10}
        >
          Saqlash
        </button>
        {hasApiKey() ? (
          <button
            className="btn btn-block btn-danger"
            onClick={() => {
              setApiKey("");
              setKeyInput("");
            }}
          >
            Kalitni o'chirish
          </button>
        ) : null}
      </Sheet>
    );
  }

  return (
    <Sheet
      title="AI rasm"
      onClose={onClose}
      actions={
        <button className="btn btn-ghost btn-sm" onClick={() => setEditingKey(true)}>
          ⚙
        </button>
      }
    >
      <Field label="Nima chizilsin?" help="O'zbekcha ham, inglizcha ham yozsangiz bo'ladi.">
        <textarea
          className="textarea"
          value={prompt}
          placeholder="Masalan: qora fonda turgan oq krossovka, yon tomondan yorug'lik"
          onChange={(e) => setPrompt(e.target.value)}
        />
      </Field>

      <Field label="Uslub">
        <div className="theme-row">
          {STYLES.map((s) => (
            <button
              key={s.id}
              className={`chip${s.id === style ? " chip-on" : ""}`}
              style={{ flex: "0 0 auto", padding: "8px 12px", fontSize: 12.5 }}
              onClick={() => setStyle(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Nisbat">
        <Segmented
          value={aspect}
          options={[
            { value: ASPECT_MAP[projectAspect], label: projectAspect },
            // Loyiha formati 1:1 bo'lsa ikkinchi tugma takrorlanmasin.
            projectAspect === "1:1"
              ? { value: "16:9" as const, label: "16:9" }
              : { value: "1:1" as const, label: "1:1" },
            { value: "auto" as const, label: "Erkin" },
          ]}
          onChange={(v) => setAspect(v as "auto" | GeminiAspect)}
        />
      </Field>

      <Toggle
        label="Fonsiz qilib ber (obyektni kesib olish)"
        value={cutout}
        onChange={setCutout}
      />

      {sources.length ? (
        <Field label="Manba rasm (ixtiyoriy)" help="Tanlansa, mavjud rasm asosida tahrirlanadi.">
          <div className="theme-row">
            <button
              className={`theme-card${sourceId === "" ? " on" : ""}`}
              style={{ width: 64 }}
              onClick={() => setSourceId("")}
            >
              <span className="preview" style={{ display: "grid", placeItems: "center" }}>
                ✕
              </span>
              <span>Yo'q</span>
            </button>
            {sources.map((a) => (
              <button
                key={a.id}
                className={`theme-card${sourceId === a.id ? " on" : ""}`}
                style={{ width: 64 }}
                onClick={() => setSourceId(a.id)}
              >
                <img
                  src={sourceUrls[a.id]}
                  alt=""
                  style={{ width: "100%", height: 48, objectFit: "cover", display: "block" }}
                />
              </button>
            ))}
          </div>
        </Field>
      ) : null}

      {status ? (
        <div className="note">
          <span className="spinner" style={{ display: "inline-block", verticalAlign: "-3px" }} />{" "}
          {status}
        </div>
      ) : null}
      {error ? <div className="note err">{error}</div> : null}

      {resultUrl ? (
        <div className="stack">
          <img
            src={resultUrl}
            alt="Natija"
            style={{
              width: "100%",
              borderRadius: 14,
              border: "1px solid var(--border)",
              background:
                "repeating-conic-gradient(#1b1e2a 0% 25%, #14161f 0% 50%) 50% / 20px 20px",
            }}
          />
          <button className="btn btn-primary btn-block" onClick={keep} disabled={busy}>
            Saqlash va tanlash
          </button>
        </div>
      ) : null}

      <button className="btn btn-primary btn-block" onClick={run} disabled={busy}>
        {busy ? <span className="spinner" /> : "✨"} {resultUrl ? "Qayta yaratish" : "Rasm yaratish"}
      </button>
      {busy ? (
        <button className="btn btn-block" onClick={() => abortRef.current?.abort()}>
          Bekor qilish
        </button>
      ) : null}
    </Sheet>
  );
}
