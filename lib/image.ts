/**
 * Strips EXIF metadata by drawing the file to a canvas and optionally
 * resizes the image to fit within maxDim. Returns a new Blob.
 */
export async function stripExifAndResizeIfNeeded(
  file: File,
  maxDim = 4096
): Promise<Blob> {
  const img = await readImageFromFile(file);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  const type = file.type === 'image/webp' ? 'image/webp' : 'image/png';
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), type, 0.95));
  return blob;
}

function readImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Optionally uploads an image to Vercel Blob when STORAGE_MODE=blob. Returns
 * the URL if the upload succeeds, undefined otherwise.
 */
export async function maybeStoreImage(
  base64: string,
  key: string
): Promise<string | undefined> {
  if (typeof process === 'undefined') return undefined;
  if (process.env.STORAGE_MODE !== 'blob') return undefined;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return undefined;
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const res = await fetch(`https://blob.vercel-storage.com/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'x-vercel-blobby-token': token,
      'content-type': 'image/png'
    },
    body: bytes
  });
  if (!res.ok) throw new Error('Blob upload failed');
  const url = res.headers.get('location') || `https://blob.vercel-storage.com/${encodeURIComponent(key)}`;
  return url;
}