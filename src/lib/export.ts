import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { ASPECTS, type Project } from "../types";
import { layoutScenes, renderFrame, totalDuration } from "../render/engine";
import { getAsset } from "./db";

export type ExportEngine = "webcodecs" | "recorder";

export interface ExportOptions {
  /** Sifat — kadrning KALTA tomoni (9:16 uchun kenglik, 16:9 uchun balandlik). */
  quality: 1080 | 720 | 480;
  fps: number;
  /** Musiqa qo'shilsinmi. */
  withAudio: boolean;
  /** Foydalanuvchi tanlagan dvigatel; berilmasa avtomatik. */
  engine?: ExportEngine;
}

export interface ExportProgress {
  phase: "prepare" | "render" | "audio" | "finalize";
  /** 0..1 */
  value: number;
  message: string;
}

export interface ExportResult {
  blob: Blob;
  mime: string;
  ext: "mp4" | "webm";
  engine: ExportEngine;
  durationMs: number;
  width: number;
  height: number;
}

const AVC_CANDIDATES = [
  "avc1.640034",
  "avc1.640033",
  "avc1.640032",
  "avc1.640028",
  "avc1.4d0034",
  "avc1.4d0028",
  "avc1.42e034",
  "avc1.42e028",
  "avc1.42e01f",
];

export function webCodecsAvailable(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window && "VideoFrame" in window;
}

/**
 * Chiqish o'lchami. Sifat kadrning kalta tomoni bo'yicha o'lchanadi:
 * 9:16 da «1080p» = 1080x1920, 16:9 da esa 1920x1080.
 * Kodlovchilar juft o'lcham talab qiladi, shuning uchun yaxlitlanadi.
 */
export function outputSize(project: Project, quality: number) {
  const a = ASPECTS[project.aspect];
  const scale = quality / Math.min(a.w, a.h);
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  return { width: even(a.w * scale), height: even(a.h * scale) };
}

function bitrateFor(width: number, height: number, fps: number): number {
  // ~0.11 bit/piksel — ijtimoiy tarmoqlar uchun yetarli sifat.
  const bpp = 0.11;
  return Math.round(Math.min(16_000_000, Math.max(2_000_000, width * height * fps * bpp)));
}

async function pickAvcCodec(width: number, height: number, fps: number): Promise<string | null> {
  if (!webCodecsAvailable()) return null;
  for (const codec of AVC_CANDIDATES) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate: bitrateFor(width, height, fps),
        framerate: fps,
      });
      if (support.supported) return codec;
    } catch {
      /* keyingisini sinaymiz */
    }
  }
  return null;
}

interface RenderedAudio {
  buffer: AudioBuffer;
  sampleRate: number;
  channels: number;
}

/** Musiqani video uzunligiga moslab (offset, loop, gain, fade) render qiladi. */
async function renderAudio(
  project: Project,
  durationMs: number,
  sampleRate = 48000,
): Promise<RenderedAudio | null> {
  const track = project.audio;
  if (!track) return null;
  const rec = await getAsset(track.assetId);
  if (!rec) return null;

  const bytes = await rec.blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const probe = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await probe.decodeAudioData(bytes);
  } finally {
    void probe.close();
  }

  const seconds = durationMs / 1000;
  const channels = Math.min(2, Math.max(1, decoded.numberOfChannels));
  const offline = new OfflineAudioContext(channels, Math.ceil(seconds * sampleRate), sampleRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.loop = true;
  src.loopStart = Math.min(track.offsetMs / 1000, Math.max(0, decoded.duration - 0.05));
  src.loopEnd = decoded.duration;

  const gain = offline.createGain();
  const level = Math.max(0, Math.min(2, track.gain));
  gain.gain.setValueAtTime(level, 0);
  const fade = Math.max(0, track.fadeOutMs) / 1000;
  if (fade > 0.01 && seconds > fade) {
    gain.gain.setValueAtTime(level, seconds - fade);
    gain.gain.linearRampToValueAtTime(0.0001, seconds);
  }

  src.connect(gain).connect(offline.destination);
  src.start(0, src.loopStart);
  const buffer = await offline.startRendering();
  return { buffer, sampleRate, channels };
}

function interleavePlanar(buffer: AudioBuffer, from: number, frames: number, channels: number) {
  const out = new Float32Array(frames * channels);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1));
    out.set(data.subarray(from, from + frames), c * frames);
  }
  return out;
}

/**
 * Bu qurilma tezkor MP4 (H.264) kodlashni uddalaydimi.
 * `webCodecsAvailable` faqat API borligini bildiradi — bu esa
 * haqiqiy kodek qo'llab-quvvatlashini tekshiradi.
 */
export async function canEncodeMp4(
  project: Project,
  quality: number,
  fps: number,
): Promise<boolean> {
  const { width, height } = outputSize(project, quality);
  return (await pickAvcCodec(width, height, Math.max(15, Math.min(60, fps)))) !== null;
}

export interface ExportHandle {
  cancel(): void;
}

/**
 * Videoni eksport qiladi.
 * Asosiy yo'l — WebCodecs (real vaqtdan tez, aniq kadrli MP4).
 * Qo'llab-quvvatlanmasa MediaRecorder orqali real vaqtda yoziladi.
 */
export async function exportVideo(
  project: Project,
  images: Map<string, HTMLImageElement>,
  opts: ExportOptions,
  onProgress: (p: ExportProgress) => void,
  signal?: AbortSignal,
): Promise<ExportResult> {
  const durationMs = totalDuration(project);
  if (durationMs < 200) throw new Error("Video juda qisqa — kamida bitta sahna qo'shing.");

  const { width, height } = outputSize(project, opts.quality);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 2 || height < 2) {
    throw new Error("Eksport o'lchami noto'g'ri.");
  }
  const fps = Math.max(15, Math.min(60, Math.round(opts.fps))) || 30;
  const preferred = opts.engine;

  if (preferred !== "recorder") {
    const codec = await pickAvcCodec(width, height, fps);
    if (codec) {
      return exportWithWebCodecs(
        project,
        images,
        { width, height, fps, codec, durationMs, withAudio: opts.withAudio },
        onProgress,
        signal,
      );
    }
  }
  return exportWithRecorder(
    project,
    images,
    { width, height, fps, durationMs, withAudio: opts.withAudio },
    onProgress,
    signal,
  );
}

interface CoreOptions {
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  withAudio: boolean;
}

async function exportWithWebCodecs(
  project: Project,
  images: Map<string, HTMLImageElement>,
  opts: CoreOptions & { codec: string },
  onProgress: (p: ExportProgress) => void,
  signal?: AbortSignal,
): Promise<ExportResult> {
  const { width, height, fps, durationMs, codec } = opts;
  const frameCount = Math.max(1, Math.round((durationMs / 1000) * fps));

  onProgress({ phase: "prepare", value: 0, message: "Tayyorlanmoqda…" });

  let audio: RenderedAudio | null = null;
  let audioCodecOk = false;
  if (opts.withAudio && project.audio) {
    onProgress({ phase: "audio", value: 0.02, message: "Musiqa tayyorlanmoqda…" });
    audio = await renderAudio(project, durationMs).catch((err) => {
      console.warn("Musiqani o'qib bo'lmadi:", err);
      return null;
    });
    if (audio && "AudioEncoder" in window) {
      try {
        const sup = await AudioEncoder.isConfigSupported({
          codec: "mp4a.40.2",
          sampleRate: audio.sampleRate,
          numberOfChannels: audio.channels,
          bitrate: 128_000,
        });
        audioCodecOk = !!sup.supported;
      } catch {
        audioCodecOk = false;
      }
    }
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width, height, frameRate: fps },
    ...(audio && audioCodecOk
      ? {
          audio: {
            codec: "aac" as const,
            numberOfChannels: audio.channels,
            sampleRate: audio.sampleRate,
          },
        }
      : {}),
    fastStart: "in-memory" as const,
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });
  encoder.configure({
    codec,
    width,
    height,
    bitrate: bitrateFor(width, height, fps),
    framerate: fps,
    latencyMode: "quality",
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const slices = layoutScenes(project);
  const gopSize = Math.max(1, Math.round(fps * 2));

  try {
    for (let i = 0; i < frameCount; i++) {
      if (signal?.aborted) throw new DOMException("Bekor qilindi", "AbortError");
      if (encoderError) throw encoderError;

      const timeMs = (i * 1000) / fps;
      renderFrame(canvas, project, timeMs, { images, draft: false, slices });

      const frame = new VideoFrame(canvas, {
        timestamp: Math.round((i * 1_000_000) / fps),
        duration: Math.round(1_000_000 / fps),
      });
      encoder.encode(frame, { keyFrame: i % gopSize === 0 });
      frame.close();

      // Kodlovchi navbati o'sib ketmasligi uchun nafas olamiz.
      if (encoder.encodeQueueSize > 6 || i % 5 === 0) {
        await new Promise<void>((r) => setTimeout(r, 0));
      }
      onProgress({
        phase: "render",
        value: (i + 1) / frameCount,
        message: `Kadr ${i + 1} / ${frameCount}`,
      });
    }

    await encoder.flush();
    if (encoderError) throw encoderError;

    if (audio && audioCodecOk) {
      onProgress({ phase: "audio", value: 0.98, message: "Musiqa kodlanmoqda…" });
      await encodeAudioTrack(audio, muxer, signal);
    }

    onProgress({ phase: "finalize", value: 1, message: "Fayl yig'ilmoqda…" });
    muxer.finalize();
    const blob = new Blob([target.buffer], { type: "video/mp4" });
    return {
      blob,
      mime: "video/mp4",
      ext: "mp4",
      engine: "webcodecs",
      durationMs,
      width,
      height,
    };
  } finally {
    if (encoder.state !== "closed") encoder.close();
  }
}

async function encodeAudioTrack(
  audio: RenderedAudio,
  muxer: Muxer<ArrayBufferTarget>,
  signal?: AbortSignal,
) {
  const { buffer, sampleRate, channels } = audio;
  let err: Error | null = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => {
      err = e instanceof Error ? e : new Error(String(e));
    },
  });
  encoder.configure({
    codec: "mp4a.40.2",
    sampleRate,
    numberOfChannels: channels,
    bitrate: 128_000,
  });

  const chunkFrames = 1024;
  const total = buffer.length;
  try {
    for (let offset = 0; offset < total; offset += chunkFrames) {
      if (signal?.aborted) throw new DOMException("Bekor qilindi", "AbortError");
      if (err) throw err;
      const frames = Math.min(chunkFrames, total - offset);
      const data = interleavePlanar(buffer, offset, frames, channels);
      const audioData = new AudioData({
        format: "f32-planar",
        sampleRate,
        numberOfFrames: frames,
        numberOfChannels: channels,
        timestamp: Math.round((offset / sampleRate) * 1_000_000),
        data,
      });
      encoder.encode(audioData);
      audioData.close();
      if (encoder.encodeQueueSize > 16) await new Promise<void>((r) => setTimeout(r, 0));
    }
    await encoder.flush();
    if (err) throw err;
  } finally {
    if (encoder.state !== "closed") encoder.close();
  }
}

function pickRecorderMime(): { mime: string; ext: "mp4" | "webm" } {
  // Faqat kodeki aniq ko'rsatilgan variantlar: "video/mp4" ba'zi qurilmalarda
  // VP9 bilan mp4 ichida yozib qo'yadi — bunday fayl ko'p ilovalarda ochilmaydi.
  const candidates: { mime: string; ext: "mp4" | "webm" }[] = [
    { mime: 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', ext: "mp4" },
    { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
    { mime: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "", ext: "webm" };
}

/** Zaxira yo'l: kanvasni real vaqtda yozib olish. */
async function exportWithRecorder(
  project: Project,
  images: Map<string, HTMLImageElement>,
  opts: CoreOptions,
  onProgress: (p: ExportProgress) => void,
  signal?: AbortSignal,
): Promise<ExportResult> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Bu brauzer video yozishni qo'llab-quvvatlamaydi.");
  }
  const { width, height, fps, durationMs } = opts;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const slices = layoutScenes(project);
  const stream = canvas.captureStream(fps);

  onProgress({ phase: "prepare", value: 0, message: "Yozish tayyorlanmoqda…" });

  let audioCtx: AudioContext | null = null;
  let source: AudioBufferSourceNode | null = null;
  if (opts.withAudio && project.audio) {
    const audio = await renderAudio(project, durationMs, 48000).catch(() => null);
    if (audio) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioCtx();
      const dest = audioCtx.createMediaStreamDestination();
      source = audioCtx.createBufferSource();
      source.buffer = audio.buffer;
      source.connect(dest);
      for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);
    }
  }

  const { mime, ext } = pickRecorderMime();
  const recorder = new MediaRecorder(stream, {
    ...(mime ? { mimeType: mime } : {}),
    videoBitsPerSecond: bitrateFor(width, height, fps),
  });
  const parts: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) parts.push(e.data);
  };

  const done = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = (e) => reject((e as unknown as { error?: Error }).error ?? new Error("Yozishda xato"));
  });

  // Birinchi kadrni oldindan chizamiz — yozuv qora kadrdan boshlanmasin.
  renderFrame(canvas, project, 0, { images, draft: false, slices });
  recorder.start(250);
  source?.start(0);
  const startedAt = performance.now();

  await new Promise<void>((resolve, reject) => {
    let lastTick = performance.now();
    // Ilova fonga o'tsa requestAnimationFrame to'xtaydi — shunda yozuvni
    // cheksiz kutib turmasdan yakunlaymiz.
    const watchdog = window.setInterval(() => {
      if (performance.now() - lastTick > 6000) {
        window.clearInterval(watchdog);
        resolve();
      }
    }, 1000);
    const finish = (fn: () => void) => {
      window.clearInterval(watchdog);
      fn();
    };
    const tick = () => {
      lastTick = performance.now();
      if (signal?.aborted) {
        finish(() => reject(new DOMException("Bekor qilindi", "AbortError")));
        return;
      }
      const elapsed = performance.now() - startedAt;
      if (elapsed >= durationMs) {
        renderFrame(canvas, project, durationMs - 1, { images, draft: false, slices });
        finish(resolve);
        return;
      }
      renderFrame(canvas, project, elapsed, { images, draft: false, slices });
      onProgress({
        phase: "render",
        value: elapsed / durationMs,
        message: `Yozilmoqda — ${Math.round(elapsed / 100) / 10}s / ${Math.round(durationMs / 100) / 10}s`,
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }).finally(() => {
    // Oxirgi kadrlar ham tushishi uchun kichik kechikish.
    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
      source?.stop();
      void audioCtx?.close();
      for (const track of stream.getTracks()) track.stop();
    }, 180);
  });

  onProgress({ phase: "finalize", value: 1, message: "Fayl yig'ilmoqda…" });
  await done;
  const type = recorder.mimeType || mime || "video/webm";
  // Kengaytma tanlangan nomzoddan olinadi; nomzod topilmagan bo'lsagina
  // yozuvchi bergan turga qaraymiz.
  const finalExt: "mp4" | "webm" = mime ? ext : type.includes("mp4") ? "mp4" : "webm";
  const blob = new Blob(parts, { type });
  return {
    blob,
    mime: type,
    ext: finalExt,
    engine: "recorder",
    durationMs,
    width,
    height,
  };
}

/** Joriy kadrni PNG rasm sifatida qaytaradi (muqova uchun). */
export async function exportFrame(
  project: Project,
  images: Map<string, HTMLImageElement>,
  timeMs: number,
  quality: 1080 | 720 = 1080,
): Promise<Blob> {
  const { width, height: h } = outputSize(project, quality);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = h;
  renderFrame(canvas, project, timeMs, { images, draft: false });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Rasm yaratilmadi"));
    }, "image/png");
  });
}
