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
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [currentControls, setCurrentControls] = useState<ControlsValues>({
    size: '1024x1024',
    styleStrength: 'medium',
    diorama: false,
    keepPrivate: true,
    customPrompt: '',
    removeCaptions: false,
    generationMode: 'transform'
  });
  const controlsRef = useRef<ControlsValues>(currentControls);

  /**
   * Handles when a new image is accepted from the dropzone. Resets state.
   */
  const handleFile = (dataUrl: string) => {
    setOriginalSrc(dataUrl);
    setStylizedSrc(null);
    setShareUrl(null);
  };

  /**
   * Sends the selected image to the stylize streaming API with current options and
   * updates UI state throughout the process with real-time progress updates.
   */
  const handleGenerate = async (file: File) => {
    setLoading(true);
    setProgress(0);

    try {
      const form = new FormData();
      form.append('image', file, file.name);
      form.append('size', controlsRef.current.size);
      form.append('styleStrength', controlsRef.current.styleStrength);
      form.append('diorama', String(controlsRef.current.diorama));
      form.append('private', String(controlsRef.current.keepPrivate));
      form.append('customPrompt', controlsRef.current.customPrompt);
      form.append('removeCaptions', String(controlsRef.current.removeCaptions));
      form.append('generationMode', controlsRef.current.generationMode);

      const res = await fetch('/api/stylize-stream', {
        method: 'POST',
        body: form
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Append new chunk to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines from buffer
        const lines = buffer.split('\n');

        // Keep the last (potentially incomplete) line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (jsonStr) {
                const data = JSON.parse(jsonStr);

                switch (data.type) {
                  case 'progress':
                    setProgress(data.progress);
                    setProgressMessage(data.message);
                    console.log(`Progress: ${data.progress}% - ${data.message}`);
                    break;

                  case 'complete':
                    const result = data.data;
                    setStylizedSrc(result.imageBase64);
                    setShareUrl(result.imageUrl || null);
                    setProgress(100);
                    break;

                  case 'error':
                    throw new Error(data.message);

                  default:
                    console.log('Unknown message type:', data.type);
                }
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError, 'Line:', line.slice(6));
            }
          }
        }
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to generate image.');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  const handleGenerateRandom = async () => {
    setLoading(true);
    setProgress(0);

    try {
      const form = new FormData();
      form.append('size', controlsRef.current.size);
      form.append('styleStrength', controlsRef.current.styleStrength);
      form.append('diorama', String(controlsRef.current.diorama));
      form.append('private', String(controlsRef.current.keepPrivate));
      form.append('customPrompt', controlsRef.current.customPrompt);
      form.append('removeCaptions', String(controlsRef.current.removeCaptions));
      form.append('generationMode', 'random_crypto');

      const res = await fetch('/api/stylize-stream', {
        method: 'POST',
        body: form
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Append new chunk to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines from buffer
        const lines = buffer.split('\n');

        // Keep the last (potentially incomplete) line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (jsonStr) {
                const data = JSON.parse(jsonStr);

                switch (data.type) {
                  case 'progress':
                    setProgress(data.progress);
                    setProgressMessage(data.message);
                    console.log(`Progress: ${data.progress}% - ${data.message}`);
                    break;

                  case 'complete':
                    const result = data.data;
                    setStylizedSrc(result.imageBase64);
                    setShareUrl(result.imageUrl || null);
                    setProgress(100);
                    break;

                  case 'error':
                    throw new Error(data.message);

                  default:
                    console.log('Unknown message type:', data.type);
                }
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError, 'Line:', line.slice(6));
            }
          }
        }
      }
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
          <ControlsPanel onChange={(v) => {
            controlsRef.current = v;
            setCurrentControls(v);
          }} />
          <GenerateButton
            disabled={(!originalSrc && currentControls.generationMode !== 'random_crypto') || loading}
            loading={loading}
            progress={progress}
            progressMessage={progressMessage}
            onClick={() => {
              if (currentControls.generationMode === 'random_crypto') {
                // For random crypto generation, we don't need an uploaded image
                handleGenerateRandom();
              } else {
                if (!originalSrc) return;
                fetch(originalSrc)
                  .then((r) => r.blob())
                  .then((blob) => new File([blob], 'upload.png', { type: 'image/png' }))
                  .then(handleGenerate);
              }
            }}
          />
          {progress > 0 && (
            <div aria-live="polite" className="text-sm text-white/60">
              Processing… {progress}%
            </div>
          )}
        </div>

        <div className="card p-4 lg:col-span-2 space-y-4">
          {currentControls.generationMode === 'random_crypto' ? (
            <div className="text-white/60 text-center py-20">
              <h3 className="text-xl font-medium mb-2">Random Sackboy Generation</h3>
              <p>AI will create a unique memecoin-themed Sackboy scene for you!</p>
              <p className="text-sm mt-2">No image upload needed - just click Generate.</p>
            </div>
          ) : !originalSrc ? (
            <div className="text-white/60">Upload an image to begin.</div>
          ) : null}

          {originalSrc && !stylizedSrc && currentControls.generationMode !== 'random_crypto' && (
            <img src={originalSrc} alt="Original" className="w-full rounded-xl" />
          )}
          {originalSrc && stylizedSrc && currentControls.generationMode !== 'random_crypto' && (
            <ImageCompare original={originalSrc} stylized={stylizedSrc} />
          )}
          {stylizedSrc && currentControls.generationMode === 'random_crypto' && (
            <img src={stylizedSrc} alt="Generated Crypto Sackboy" className="w-full rounded-xl" />
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
