import { useState } from "react";
import type { AspectId, FieldDef, Scene, TransitionId } from "../types";
import { getTemplate } from "../render/templates";
import { templatesByGroup, fmtDuration } from "../lib/project";
import { ColorField, Field, Segmented, Sheet, Toggle } from "./ui";
import { ImagePicker } from "./ImagePicker";

const TRANSITIONS: { value: TransitionId; label: string }[] = [
  { value: "slide-up", label: "Pastdan" },
  { value: "slide-left", label: "Yondan" },
  { value: "fade", label: "Erish" },
  { value: "zoom", label: "Zoom" },
  { value: "wipe", label: "Surish" },
  { value: "none", label: "Keskin" },
];

interface Props {
  scene: Scene;
  index: number;
  total: number;
  aspect: AspectId;
  imageUrls: Record<string, string>;
  onChange: (patch: Partial<Scene>) => void;
  onData: (key: string, value: unknown) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function SceneEditor({
  scene,
  index,
  total,
  aspect,
  imageUrls,
  onChange,
  onData,
  onMove,
  onDuplicate,
  onDelete,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const template = getTemplate(scene.template);

  return (
    <>
      <div className="stack">
        <div className="row">
          <button className="btn" onClick={() => setPickerOpen(true)}>
            {template.emoji} {template.name}
          </button>
          <button
            className="btn btn-icon"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Chapga surish"
          >
            ←
          </button>
          <button
            className="btn btn-icon"
            onClick={() => onMove(1)}
            disabled={index >= total - 1}
            aria-label="O'ngga surish"
          >
            →
          </button>
        </div>

        <Field label={`Davomiyligi — ${fmtDuration(scene.durationMs)}`}>
          <input
            type="range"
            min={800}
            max={12000}
            step={100}
            value={scene.durationMs}
            onChange={(e) => onChange({ durationMs: Number(e.target.value) })}
          />
        </Field>

        <Field label="Kirish effekti">
          <select
            className="select"
            value={scene.transition}
            onChange={(e) => onChange({ transition: e.target.value as TransitionId })}
          >
            {TRANSITIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="divider" />

        {template.fields.map((field) => (
          <FieldControl
            key={field.key}
            field={field}
            value={scene.data[field.key]}
            aspect={aspect}
            imageUrls={imageUrls}
            onChange={(v) => onData(field.key, v)}
          />
        ))}

        <div className="divider" />

        <div className="row">
          <button className="btn" onClick={onDuplicate}>
            ⧉ Nusxalash
          </button>
          <button className="btn btn-danger" onClick={onDelete} disabled={total <= 1}>
            🗑 O'chirish
          </button>
        </div>
      </div>

      {pickerOpen ? (
        <TemplatePicker
          current={scene.template}
          onClose={() => setPickerOpen(false)}
          onPick={(id) => {
            const tpl = getTemplate(id);
            onChange({
              template: id,
              // Mos keladigan maydonlar saqlanadi, qolgani yangi shablon qiymati.
              data: { ...structuredClone(tpl.defaults), ...pickShared(scene.data, tpl.fields) },
              durationMs: scene.durationMs || tpl.defaultDurationMs,
            });
            setPickerOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

/** Shablon almashtirilganda mos kelgan maydon qiymatlarini olib qoladi. */
function pickShared(data: Record<string, unknown>, fields: FieldDef[]) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (data[f.key] !== undefined && data[f.key] !== "") out[f.key] = data[f.key];
  }
  return out;
}

export function TemplatePicker({
  current,
  onPick,
  onClose,
}: {
  current: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Sahna turi" onClose={onClose}>
      {templatesByGroup().map((g) => (
        <div key={g.group} className="stack">
          <div className="hint">{g.group}</div>
          <div className="tpl-grid">
            {g.items.map((t) => (
              <button
                key={t.id}
                className={`tpl-card${t.id === current ? " on" : ""}`}
                onClick={() => onPick(t.id)}
              >
                <span className="ico">{t.emoji}</span>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </Sheet>
  );
}

function FieldControl({
  field,
  value,
  aspect,
  imageUrls,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  aspect: AspectId;
  imageUrls: Record<string, string>;
  onChange: (v: unknown) => void;
}) {
  const [picking, setPicking] = useState(false);

  switch (field.type) {
    case "textarea":
      return (
        <Field label={field.label} help={field.help}>
          <textarea
            className="textarea"
            value={String(value ?? "")}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );

    case "number":
      return (
        <Field label={field.label} help={field.help}>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            value={Number(value ?? 0)}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </Field>
      );

    case "toggle":
      return <Toggle label={field.label} value={Boolean(value)} onChange={onChange} />;

    case "color":
      return (
        <Field label={field.label} help={field.help}>
          <ColorField value={String(value ?? "#ffffff")} onChange={onChange} />
        </Field>
      );

    case "select": {
      const options = field.options ?? [];
      return (
        <Field label={field.label} help={field.help}>
          {options.length <= 3 ? (
            <Segmented
              value={String(value ?? options[0]?.value ?? "")}
              options={options}
              onChange={onChange}
            />
          ) : (
            <select
              className="select"
              value={String(value ?? options[0]?.value ?? "")}
              onChange={(e) => onChange(e.target.value)}
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      );
    }

    case "image": {
      const id = String(value ?? "");
      const url = id ? imageUrls[id] : undefined;
      return (
        <>
          <Field label={field.label} help={field.help}>
            <div className="thumb-pick">
              {url ? (
                <img src={url} alt="" />
              ) : (
                <div className="placeholder">🖼</div>
              )}
              <button className="btn btn-sm" onClick={() => setPicking(true)}>
                {id ? "Almashtirish" : "Rasm tanlash"}
              </button>
              {id ? (
                <button className="btn btn-sm btn-ghost" onClick={() => onChange("")}>
                  Olib tashlash
                </button>
              ) : null}
            </div>
          </Field>
          {picking ? (
            <ImagePicker
              aspect={aspect}
              onClose={() => setPicking(false)}
              onPick={(assetId) => {
                onChange(assetId ?? "");
                setPicking(false);
              }}
            />
          ) : null}
        </>
      );
    }

    case "list": {
      const items = (Array.isArray(value) ? value : []).map(String);
      const max = field.maxItems ?? 8;
      return (
        <Field label={field.label} help={field.help}>
          <div className="stack">
            {items.map((item, i) => (
              <div className="list-item" key={i}>
                <input
                  className="input"
                  value={item}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = e.target.value;
                    onChange(next);
                  }}
                />
                <button
                  className="btn btn-icon btn-sm"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  aria-label="O'chirish"
                >
                  ✕
                </button>
              </div>
            ))}
            {items.length < max ? (
              <button className="btn btn-sm btn-block" onClick={() => onChange([...items, ""])}>
                + Qator qo'shish
              </button>
            ) : null}
          </div>
        </Field>
      );
    }

    default:
      return (
        <Field label={field.label} help={field.help}>
          <input
            className="input"
            value={String(value ?? "")}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
  }
}
