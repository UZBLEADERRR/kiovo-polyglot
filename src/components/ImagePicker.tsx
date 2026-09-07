import { useEffect, useRef, useState } from "react";
import { Sheet } from "./ui";
import { deleteAsset, listAssets, putAsset, type AssetRecord } from "../lib/db";
import { forgetImage } from "../lib/assets";
import { prepareImage } from "../lib/image";
import { removeBackground } from "../lib/cutout";
import { AiSheet } from "./AiSheet";
import type { AspectId } from "../types";

interface Props {
  onPick: (assetId: string | null) => void;
  onClose: () => void;
  title?: string;
  /** AI rasm so'ralganda shu nisbat taklif qilinadi. */
  aspect?: AspectId;
}

export function ImagePicker({ onPick, onClose, title = "Rasm tanlash", aspect = "9:16" }: Props) {
  const [items, setItems] = useState<AssetRecord[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const createdUrls = useRef<string[]>([]);

  const refresh = async () => {
    const all = (await listAssets()).filter((a) => a.kind === "image");
    setItems(all);
    const next: Record<string, string> = {};
    for (const a of all) {
      const url = URL.createObjectURL(a.blob);
      createdUrls.current.push(url);
      next[a.id] = url;
    }
    setUrls(next);
  };

  useEffect(() => {
    void refresh();
    return () => {
      for (const u of createdUrls.current) URL.revokeObjectURL(u);
      createdUrls.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    try {
      let lastId = "";
      for (const file of files.slice(0, 8)) {
        const blob = await prepareImage(file);
        const rec = await putAsset(blob, file.name || "rasm", "image");
        lastId = rec.id;
      }
      await refresh();
      if (files.length === 1 && lastId) onPick(lastId);
    } catch (err) {
      console.error(err);
      alert("Rasmni qo'shib bo'lmadi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="row">
        <button
          className="btn btn-primary"
          onClick={() => galleryRef.current?.click()}
          disabled={busy}
        >
          {busy ? <span className="spinner" /> : "🖼"} Galereya
        </button>
        <button className="btn" onClick={() => cameraRef.current?.click()} disabled={busy}>
          📷 Kamera
        </button>
      </div>

      <button className="btn btn-block" onClick={() => setAiOpen(true)} disabled={busy}>
        ✨ AI bilan rasm yaratish
      </button>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          // FileList inputga bog'langan — value tozalanishidan oldin nusxalaymiz.
          const picked = Array.from(e.target.files ?? []);
          e.target.value = "";
          void handleFiles(picked);
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          e.target.value = "";
          void handleFiles(picked);
        }}
      />

      <button className="btn btn-block" onClick={() => onPick(null)}>
        Rasmni olib tashlash
      </button>

      {items.length === 0 ? (
        <div className="empty">Hali rasm qo'shilmagan.</div>
      ) : (
        <div className="card-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {items.map((a) => (
            <div key={a.id} style={{ position: "relative" }}>
              <button
                onClick={() => onPick(a.id)}
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                  padding: 0,
                  background: "var(--surface)",
                }}
              >
                <img
                  src={urls[a.id]}
                  alt={a.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </button>
              <button
                className="btn btn-sm"
                style={{ position: "absolute", top: 5, left: 5, padding: "3px 7px" }}
                title="Fonni olib tashlash"
                aria-label="Fonni olib tashlash"
                disabled={working !== null}
                onClick={async () => {
                  setWorking(a.id);
                  try {
                    const cut = await removeBackground(a.blob);
                    const rec = await putAsset(cut, `${a.name} (fonsiz)`, "image");
                    await refresh();
                    onPick(rec.id);
                  } catch (err) {
                    console.error(err);
                    alert("Fonni olib tashlab bo'lmadi.");
                  } finally {
                    setWorking(null);
                  }
                }}
              >
                {working === a.id ? <span className="spinner" /> : "✂"}
              </button>
              <button
                className="btn btn-sm btn-danger"
                style={{ position: "absolute", top: 5, right: 5, padding: "3px 7px" }}
                onClick={async () => {
                  await deleteAsset(a.id);
                  forgetImage(a.id);
                  await refresh();
                }}
                aria-label="O'chirish"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {aiOpen ? (
        <AiSheet
          projectAspect={aspect}
          onClose={() => setAiOpen(false)}
          onCreated={(id) => {
            setAiOpen(false);
            onPick(id);
          }}
        />
      ) : null}
    </Sheet>
  );
}
