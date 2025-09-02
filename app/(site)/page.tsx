"use client";

import { useRef, useState } from 'react';
import UploadDropzone from '@/components/UploadDropzone';
import ControlsPanel, { ControlsValues } from '@/components/ControlsPanel';
import ImageCompare from '@/components/ImageCompare';
import CaptionCanvas from '@/components/CaptionCanvas';
import GenerateButton from '@/components/GenerateButton';

/**
 * Main entry page of the Sackboy Studio application. Handles file selection,
 * orchestrates generation via the API and displays the original and stylised
 * images along with the caption editor.
 */
export default function Page() {
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [stylizedSrc, setStylizedSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const controlsRef = useRef<ControlsValues>({
    size: '1024x1024',
    styleStrength: 'medium',
    diorama: false,
    keepPrivate: true,
    customPrompt: ''
  });

  /**
   * Handles when a new image is accepted from the dropzone. Resets state.
   */
  const handleFile = (dataUrl: string) => {
    setOriginalSrc(dataUrl);
    setStylizedSrc(null);
    setShareUrl(null);
  };

  /**
   * Sends the selected image to the stylize API with current options and
   * updates UI state throughout the process. Displays any errors via alert.
   */
  const handleGenerate = async (file: File) => {
    setLoading(true);
    setProgress(10);
    try {
      const form = new FormData();
      form.append('image', file, file.name);
      form.append('size', controlsRef.current.size);
      form.append('styleStrength', controlsRef.current.styleStrength);
      form.append('diorama', String(controlsRef.current.diorama));
      form.append('private', String(controlsRef.current.keepPrivate));
      form.append('customPrompt', controlsRef.current.customPrompt);

      setProgress(30);
      const res = await fetch('/api/stylize', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Unexpected error (${res.status})`);
      }
      setProgress(70);
      const json = await res.json();
      const b64 = json.imageBase64 as string;
      setStylizedSrc(b64);
      setShareUrl(json.imageUrl || null);
      setProgress(100);
    } catch (e: any) {
      alert(e?.message || 'Failed to generate image.');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  return (
    <main className="container py-10 space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">Sackboy Studio</h1>
        <p className="text-white/70 max-w-2xl">
          Turn your photo into a cozy knitted burlap plush craft scene. Add a caption, then download your creation.
          We never send your caption to the image model.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-4 lg:col-span-1 space-y-4">
          <UploadDropzone onAccepted={handleFile} />
          <ControlsPanel onChange={(v) => (controlsRef.current = v)} />
          <GenerateButton
            disabled={!originalSrc || loading}
            loading={loading}
            progress={progress}
            onClick={() => {
              if (!originalSrc) return;
              fetch(originalSrc)
                .then((r) => r.blob())
                .then((blob) => new File([blob], 'upload.png', { type: 'image/png' }))
                .then(handleGenerate);
            }}
          />
          {progress > 0 && (
            <div aria-live="polite" className="text-sm text-white/60">
              Processing… {progress}%
            </div>
          )}
        </div>

        <div className="card p-4 lg:col-span-2 space-y-4">
          {!originalSrc && <div className="text-white/60">Upload an image to begin.</div>}
          {originalSrc && !stylizedSrc && (
            <img src={originalSrc} alt="Original" className="w-full rounded-xl" />
          )}
          {originalSrc && stylizedSrc && (
            <ImageCompare original={originalSrc} stylized={stylizedSrc} />
          )}
          {stylizedSrc && (
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-lg font-medium mb-2">Add Caption &amp; Download</h3>
              <CaptionCanvas baseImageSrc={stylizedSrc} shareUrl={shareUrl} />
            </div>
          )}
        </div>
      </section>

      <footer className="text-white/50 text-sm">
        <p>
          Uses OpenAI image generation. Prompts avoid trademarks; we describe a "knitted burlap plush craft" style.
        </p>
      </footer>
    </main>
  );
}
