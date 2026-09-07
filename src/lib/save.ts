import { Capacitor } from "@capacitor/core";

export interface SaveResult {
  method: "share" | "download" | "saved";
  path?: string;
  message: string;
}

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Faylni o'qib bo'lmadi"));
    reader.readAsDataURL(blob);
  });
}

function downloadInBrowser(blob: Blob, filename: string): SaveResult {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20_000);
  return { method: "download", message: "Fayl yuklab olindi." };
}

/**
 * Videoni saqlaydi: Androidda faylga yozib "Ulashish" oynasini ochadi,
 * brauzerda oddiy yuklab olish.
 */
export async function saveFile(blob: Blob, filename: string, title: string): Promise<SaveResult> {
  if (!isNative()) {
    // Telefon brauzerida imkoni bo'lsa tizim "ulashish" oynasi qulayroq.
    const file = new File([blob], filename, { type: blob.type });
    const nav = navigator as Navigator & {
      canShare?: (data: { files?: File[] }) => boolean;
      share?: (data: { files?: File[]; title?: string }) => Promise<void>;
    };
    if (nav.canShare?.({ files: [file] }) && nav.share) {
      try {
        await nav.share({ files: [file], title });
        return { method: "share", message: "Ulashish oynasi ochildi." };
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") {
          return { method: "share", message: "Bekor qilindi." };
        }
      }
    }
    return downloadInBrowser(blob, filename);
  }

  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");
  const data = await blobToBase64(blob);

  const written = await Filesystem.writeFile({
    path: filename,
    data,
    directory: Directory.Cache,
    recursive: true,
  });

  try {
    await Share.share({
      title,
      text: title,
      url: written.uri,
      dialogTitle: "Videoni saqlash yoki yuborish",
    });
    return { method: "share", path: written.uri, message: "Ulashish oynasi ochildi." };
  } catch (err) {
    if ((err as { message?: string })?.message?.toLowerCase().includes("cancel")) {
      return { method: "saved", path: written.uri, message: "Bekor qilindi." };
    }
    // Ulashish ishlamasa Hujjatlar papkasiga yozib ko'ramiz. Android 10+ da bu
    // ham rad etilishi mumkin — u holda kesh nusxasi haqida xabar beramiz.
    try {
      const doc = await Filesystem.writeFile({
        path: filename,
        data,
        directory: Directory.Documents,
        recursive: true,
      });
      return { method: "saved", path: doc.uri, message: "Fayl Hujjatlar papkasiga saqlandi." };
    } catch {
      return {
        method: "saved",
        path: written.uri,
        message: "Ulashish oynasi ochilmadi — fayl ilova xotirasida saqlandi.",
      };
    }
  }
}

export function safeFilename(name: string, ext: string): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9Ѐ-ӿ]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "kiovo-video";
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base}-${stamp}.${ext}`;
}
