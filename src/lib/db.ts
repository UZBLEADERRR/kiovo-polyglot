const DB_NAME = "kiovo-reels";
const DB_VERSION = 1;
const STORE = "assets";

export type AssetKind = "image" | "audio";

export interface AssetRecord {
  id: string;
  name: string;
  mime: string;
  kind: AssetKind;
  blob: Blob;
  width?: number;
  height?: number;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function uid(prefix = "a"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function putAsset(
  file: Blob,
  name: string,
  kind: AssetKind,
): Promise<AssetRecord> {
  const record: AssetRecord = {
    id: uid(kind === "image" ? "img" : "aud"),
    name,
    mime: file.type || (kind === "image" ? "image/png" : "audio/mpeg"),
    kind,
    blob: file,
    createdAt: Date.now(),
  };
  if (kind === "image") {
    const size = await imageSize(file).catch(() => undefined);
    if (size) {
      record.width = size.w;
      record.height = size.h;
    }
  }
  await tx("readwrite", (s) => s.put(record));
  return record;
}

export function getAsset(id: string): Promise<AssetRecord | undefined> {
  return tx<AssetRecord | undefined>("readonly", (s) => s.get(id));
}

export function deleteAsset(id: string): Promise<void> {
  return tx<undefined>("readwrite", (s) => s.delete(id)).then(() => undefined);
}

export function listAssets(): Promise<AssetRecord[]> {
  return tx<AssetRecord[]>("readonly", (s) => s.getAll()).then((all) =>
    all.sort((a, b) => b.createdAt - a.createdAt),
  );
}

function imageSize(blob: Blob): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
