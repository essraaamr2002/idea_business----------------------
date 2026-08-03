/** Browser-side image compression and resilient upload helpers for messages. */

export type CompressOptions = {
  maxDim?: number;       // max width/height in px
  quality?: number;      // 0..1
  mimeType?: string;     // output mime (default image/webp; falls back to jpeg)
};

/** Compress an image File. Returns a new File. Non-image input is returned unchanged. */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // Skip tiny images and GIFs/SVGs we don't want to recompress.
  if (file.size < 256 * 1024) return file;
  if (/(gif|svg|x-icon)/.test(file.type)) return file;

  const { maxDim = 1600, quality = 0.82, mimeType = "image/webp" } = opts;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    let { width, height } = img;
    if (width <= maxDim && height <= maxDim && file.size < 1024 * 1024) return file;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality))
      ?? await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Upload with exponential-backoff retry. */
export async function uploadWithRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const max = opts.maxAttempts ?? 3;
  const base = opts.baseDelayMs ?? 600;
  let lastErr: any;
  for (let i = 0; i < max; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (i < max - 1) await new Promise((r) => setTimeout(r, base * Math.pow(2, i)));
    }
  }
  throw lastErr;
}
