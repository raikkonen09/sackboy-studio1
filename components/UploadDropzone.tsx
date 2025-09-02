"use client";

import { useCallback, useRef, useState } from 'react';
import { stripExifAndResizeIfNeeded } from '@/lib/image';
import { validateUpload } from '@/lib/validation';

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * A drag‑and‑drop upload area for accepting a single image. It validates
 * size/type and strips EXIF data client side. On success it calls
 * `onAccepted` with a data URL for preview.
 */
export default function UploadDropzone({ onAccepted }: { onAccepted: (dataUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const onFiles = useCallback(async (files: FileList | null) => {
    if (!files || !files.length) return;
    const f = files[0];
    const err = validateUpload(f);
    if (err) {
      alert(err);
      return;
    }
    const clean = await stripExifAndResizeIfNeeded(f, 4096);
    const dataUrl = await blobToDataUrl(clean);
    onAccepted(dataUrl);
  }, [onAccepted]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${
        dragOver ? 'border-accent/70 bg-accent/5' : 'border-white/10'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      aria-label="Upload image"
    >
      <p className="mb-2">Drop an image here or click to browse</p>
      <p className="text-xs text-white/50">PNG/JPG/WebP · max 8 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(',')}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
    </div>
  );
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}