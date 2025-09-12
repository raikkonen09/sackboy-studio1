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
  const [showOnlyCaptionPanel, setShowOnlyCaptionPanel] = useState(false);
  const [modalImage, setModalImage] = useState<{src: string, alt: string} | null>(null);
  const [currentControls, setCurrentControls] = useState<ControlsValues>({
    size: '1024x1024',
    styleStrength: 'medium',
    diorama: false,
    keepPrivate: true,
    customPrompt: '',
    removeCaptions: false,
    generationMode: 'transform',
    result: null
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
                    setShowOnlyCaptionPanel(true);
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
                    setShowOnlyCaptionPanel(true);
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

  const handleGeneratePokemonCard = async () => {
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
      form.append('generationMode', 'pokemon_card');

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
                    setShowOnlyCaptionPanel(true);
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
      alert(e?.message || 'Failed to generate Pokemon card.');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  /**
   * Handles opening an image in the modal
   */
  const handleImageClick = (src: string, alt: string) => {
    setModalImage({ src, alt });
  };

  return (
      <>
        {showOnlyCaptionPanel && stylizedSrc ? (
            // Show only the caption panel for random crypto
            <main className="container py-10">
              <div className="max-w-4xl mx-auto">
                <div className="card p-6 space-y-6">
                  {/* Caption and download section */}
                  <div className="space-y-4">
                    <div className="space-y-2 text-center">
                      <h2 className="text-2xl font-semibold text-orange-400 flex items-center justify-center gap-2">
                        ✏️ Add Caption & Download
                      </h2>
                      <p className="text-sm opacity-75">
                        Add a creative caption to complete your $Sackboys masterpiece!
                      </p>
                    </div>
                    <CaptionCanvas baseImageSrc={stylizedSrc} shareUrl={shareUrl} />
                  </div>

                  {/* Back button */}
                  <div className="text-center pt-4">
                    <button
                        onClick={() => {
                          setShowOnlyCaptionPanel(false);
                          setStylizedSrc(null);
                          setShareUrl(null);
                        }}
                        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                    >
                      🔄 Generate Another
                    </button>
                  </div>
                </div>
              </div>
            </main>
        ) : (
            // Show full interface
            <main className="container py-6 md:py-10 space-y-6 md:space-y-10">
              {/* Hero Header with LittleBigPlanet inspiration */}
              <header className="card p-4 md:p-6 space-y-4 md:space-y-6 text-center lg:text-left">
                <div className="flex flex-col lg:flex-row items-center gap-4 md:gap-6">
                  <div className="flex-1 space-y-3 md:space-y-4">
                    <div className="card p-3 md:p-4 flex flex-col sm:flex-row items-center gap-2 md:gap-3 justify-center lg:justify-start">
                      <img src="/favicon.webp" className="w-[40px] sm:w-[50px] h-auto" alt="Sackboy Studio Icon" />
                      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center sm:text-left">
                         Sackboy Studio
                      </h1>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-base sm:text-lg lg:text-xl max-w-3xl leading-relaxed px-2 sm:px-0">
                        Welcome to the magical world of craft and creativity! Transform your photos into cozy knitted
                        burlap plush scenes inspired by the whimsical universe of $Sackboys.
                        Create your own Sackboy adventure with the power of imagination and AI.
                        <br/><span className="text-orange-400 font-medium break-all sm:break-normal">Join the $Sackboys cult!<br/>
                        CA: 5umdEnYVe9c7YsGWzBAW1xbBGYDF6BwW8qruFmmPbonk</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center lg:justify-start px-2 sm:px-0">
              <span
                  className="px-2 md:px-3 py-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs md:text-sm rounded-full font-medium">
                ✨ Craft Magic
              </span>
                      <span
                          className="px-2 md:px-3 py-1 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs md:text-sm rounded-full font-medium">
                🎨 Creative Studio
              </span>
                      <span
                          className="px-2 md:px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs md:text-sm rounded-full font-medium">
                🌟 LBP Inspired
              </span>
                    </div>
                  </div>

                  {/* Placeholder for Sackboy character image */}
                  <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-64 lg:h-64 flex-shrink-0">
                    <img
                      src="/sackboy-bonk.png"
                      alt="Sackboy Character"
                      className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick("/sackboy-bonk.png", "Sackboy Character")}
                    />
                  </div>
                </div>
              </header>

              {/* Main Content Grid */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Controls Panel */}
                <div className="card p-4 md:p-6 lg:col-span-1 space-y-4 md:space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-lg md:text-xl font-semibold text-orange-400 flex items-center gap-2">
                      🎛️ Craft Controls
                    </h2>
                    <p className="text-xs md:text-sm opacity-75">
                      Customize your $Sackboys adventure
                    </p>
                  </div>

                  <UploadDropzone onAccepted={handleFile} />

                  <ControlsPanel onChange={(v) => {
                    controlsRef.current = v;
                    setCurrentControls(v);
                  }} />

                  <GenerateButton
                      disabled={(!originalSrc && currentControls.generationMode !== 'random_crypto' && currentControls.generationMode !== 'pokemon_card') || loading}
                      loading={loading}
                      progress={progress}
                      progressMessage={progressMessage}
                      onClick={() => {
                        if (currentControls.generationMode === 'random_crypto') {
                          // For random crypto generation, we don't need an uploaded image
                          handleGenerateRandom();
                        } else if (currentControls.generationMode === 'pokemon_card') {
                          // For Pokemon card generation, we don't need an uploaded image
                          handleGeneratePokemonCard();
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
                      <div className="space-y-2">
                        <div className="progress-bar h-3">
                          <div
                              className="progress-fill h-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div aria-live="polite" className="text-xs md:text-sm text-center opacity-75">
                          🎨 Crafting magic... {progress}%
                          {progressMessage && (
                              <div className="text-xs mt-1 opacity-60">{progressMessage}</div>
                          )}
                        </div>
                      </div>
                  )}

                  {/* LittleBigPlanet Tips */}
                  <div className="bg-gradient-to-br from-orange-900/30 to-yellow-900/30 border border-orange-500/30 rounded-xl p-3 md:p-4 space-y-2">
                    <h3 className="text-xs md:text-sm font-semibold text-orange-300 flex items-center gap-2">
                      💡 Craft Tips
                    </h3>
                    <ul className="text-xs space-y-1 opacity-75">
                      <li>• Try "Diorama Background" for 3D depth</li>
                      <li>• Higher style strength = more craft texture</li>
                      <li>• Custom prompts add unique elements</li>
                      <li>• Random mode creates surprise adventures!</li>
                    </ul>
                  </div>
                </div>

                {/* Image Display Area */}
                <div className="card p-4 md:p-6 lg:col-span-2 space-y-4 md:space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-orange-400 flex items-center gap-2">
                      🖼️ Your Creation
                    </h2>
                    <p className="text-sm opacity-75">
                      Watch your photo transform into a $Sackboys scene
                    </p>
                  </div>

                  {/* Content based on generation mode */}
                  {currentControls.generationMode === 'random_crypto' && !currentControls.result?.ok ? (
                      <div className="text-center py-16 space-y-4">
                        <div className="w-72 h-72 mx-auto">
                          <img
                            src="/sackboy1.png"
                            alt="Random Sackboy"
                            className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleImageClick("/sackboy1.png", "Random Sackboy")}
                          />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-semibold text-orange-300">Random Sackboy Adventure</h3>
                          <p className="text-lg opacity-75">AI will create a unique memecoin-themed Sackboy scene!</p>
                          <p className="text-sm opacity-60">No image upload needed - just click Generate and let the magic happen.</p>
                        </div>

                        {/* Placeholder for LittleBigPlanet world elements */}
                        <div className="grid grid-cols-3 gap-8 mt-8 max-w-2xl mx-auto">
                          <div className="w-40 h-40 mx-auto cursor-pointer" onClick={() => handleImageClick("/random.png", "LBP World")}>
                            <img
                              src="/random.png"
                              alt="LBP World"
                              className="w-full h-full object-contain hover:opacity-80 transition-opacity"
                            />
                          </div>
                          <div className="w-40 h-40 mx-auto cursor-pointer" onClick={() => handleImageClick("/sackboy6.png", "Craft Items")}>
                            <img
                              src="/sackboy6.png"
                              alt="Craft Items"
                              className="w-full h-full object-contain hover:opacity-80 transition-opacity"
                            />
                          </div>
                          <div className="w-40 h-40 mx-auto cursor-pointer" onClick={() => handleImageClick("/random1.png", "Characters")}>
                            <img
                              src="/random1.png"
                              alt="Characters"
                              className="w-full h-full object-contain hover:opacity-80 transition-opacity"
                            />
                          </div>
                        </div>
                      </div>
                  ) : currentControls.generationMode === 'pokemon_card' && !currentControls.result?.ok ? (
                      <div className="text-center py-16 space-y-4">
                        <div className="w-72 h-72 mx-auto">
                          <img
                            src="/pikachu.png"
                            alt="Sackmon Card Preview"
                            className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleImageClick("/pikachu.png", "Sackmon Card Preview")}
                          />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-semibold text-orange-300">Sackmon Trading Card</h3>
                          <p className="text-lg opacity-75">AI will create a unique Pokémon-style trading card featuring Sackboy!</p>
                          <p className="text-sm opacity-60">No image upload needed - just click Generate to create your custom Sackmon card.</p>
                        </div>

                        {/* Placeholder for Pokemon card elements */}
                        <div className="grid grid-cols-3 gap-8 mt-8 max-w-2xl mx-auto">
                          <div className="w-40 h-40 mx-auto cursor-pointer" onClick={() => handleImageClick("/charizard.png", "Charizard Example")}>
                            <img
                              src="/charizard.png"
                              alt="Charizard Example"
                              className="w-full h-full object-contain hover:opacity-80 transition-opacity"
                            />
                          </div>
                          <div className="w-40 h-40 mx-auto cursor-pointer" onClick={() => handleImageClick("/blastoise.png", "Blastoise Example")}>
                            <img
                              src="/blastoise.png"
                              alt="Blastoise Example"
                              className="w-full h-full object-contain hover:opacity-80 transition-opacity"
                            />
                          </div>
                          <div className="w-40 h-40 mx-auto cursor-pointer" onClick={() => handleImageClick("/pikachu1.png", "Pikachu Example")}>
                            <img
                              src="/pikachu1.png"
                              alt="Pikachu Example"
                              className="w-full h-full object-contain hover:opacity-80 transition-opacity"
                            />
                          </div>
                        </div>
                      </div>
                  ) : !originalSrc ? (
                      <div className="text-center py-16 space-y-4">
                        <div className="w-72 h-72 mx-auto">
                          <img
                            src="/kori.png"
                            alt="Ready to Craft"
                            className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleImageClick("/kori.png", "Ready to Craft")}
                          />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-medium text-orange-300">Ready to Start Crafting?</h3>
                          <p className="opacity-75">Upload an image to begin your $Sackboys transformation journey!</p>
                        </div>

                        {/* Showcase placeholder for example transformations */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 max-w-4xl mx-auto">
                          <div className="w-80 h-80 mx-auto">
                            <img
                              src="/lynk.png"
                              alt="Example: House → Craft Scene"
                              className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => handleImageClick("/lynk.png", "Example: House → Craft Scene")}
                            />
                          </div>
                          <div className="w-80 h-80 mx-auto">
                            <img
                              src="/sackboy3.png"
                              alt="Example: Pet → Plush Character"
                              className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => handleImageClick("/sackboy3.png", "Example: Pet → Plush Character")}
                            />
                          </div>
                        </div>
                      </div>
                  ) : null}

                  {/* Original image display */}
                  {originalSrc && !stylizedSrc && currentControls.generationMode !== 'random_crypto' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-orange-300">Original Image</h3>
                        <img
                          src={originalSrc}
                          alt="Original"
                          className="w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleImageClick(originalSrc, "Original Image")}
                        />
                        <p className="text-sm opacity-75 text-center">
                          Ready to transform into a magical craft scene! ✨
                        </p>
                      </div>
                  )}

                  {/* Image comparison for transform mode */}
                  {originalSrc && stylizedSrc && currentControls.generationMode !== 'random_crypto' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-orange-300">Before & After Transformation</h3>
                        <ImageCompare original={originalSrc} stylized={stylizedSrc} onImageClick={handleImageClick} />
                      </div>
                  )}

                  {/* Generated image for random mode */}
                  {stylizedSrc && currentControls.generationMode === 'random_crypto' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-orange-300">Your Random Sackboy Adventure</h3>
                        <img
                          src={stylizedSrc}
                          alt="Generated Crypto Sackboy"
                          className="w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleImageClick(stylizedSrc, "Generated Crypto Sackboy")}
                        />
                      </div>
                  )}

                  {/* Generated image for pokemon card mode */}
                  {stylizedSrc && currentControls.generationMode === 'pokemon_card' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-orange-300">Your Sackmon Trading Card</h3>
                        <img
                          src={stylizedSrc}
                          alt="Generated Sackmon Card"
                          className="w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => handleImageClick(stylizedSrc, "Generated Sackmon Card")}
                        />
                      </div>
                  )}

                  {/* Caption and download section */}
                  {stylizedSrc && (
                      <div className="pt-6 border-t border-orange-500/20 space-y-4">
                        <h3 className="text-lg font-medium text-orange-300 flex items-center gap-2">
                          ✏️ Add Caption & Download
                        </h3>
                        <p className="text-sm opacity-75">
                          Add a creative caption to complete your $Sackboys masterpiece!
                        </p>
                        <CaptionCanvas baseImageSrc={stylizedSrc} shareUrl={shareUrl} />
                      </div>
                  )}
                </div>
              </section>

              {/* LittleBigPlanet Lore Section */}
              <section className="card p-6 space-y-4">
                <h2 className="text-xl font-semibold text-orange-400 flex items-center gap-2">
                  📚 About the LittleBigPlanet Universe
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h3 className="font-medium text-orange-300">��� Sackboy</h3>
                    <p className="text-sm opacity-75">
                      The loveable knitted character made of burlap and stuffing, with a zipper for a mouth.
                      Sackboy represents creativity, friendship, and the joy of crafting in the Imagisphere.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-orange-300">🌍 The Imagisphere</h3>
                    <p className="text-sm opacity-75">
                      A magical realm where thoughts and dreams from Earth rise up through the Cerebrum-bilical cord,
                      creating endless worlds of imagination and possibility.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium text-orange-300">🎨 Craft Aesthetic</h3>
                    <p className="text-sm opacity-75">
                      Everything in LittleBigPlanet feels handmade - from cardboard platforms to fabric textures,
                      creating a cozy, tactile world that celebrates DIY creativity.
                    </p>
                  </div>
                </div>

                {/* Placeholder for LittleBigPlanet world showcase */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="w-32 h-48 mx-auto">
                    <img
                      src="/jacked.png"
                      alt="Cardboard World"
                      className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick("/jacked.png", "Cardboard World")}
                    />
                  </div>
                  <div className="w-32 h-48 mx-auto">
                    <img
                      src="/sackboy2.png"
                      alt="Fabric Textures"
                      className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick("/sackboy2.png", "Fabric Textures")}
                    />
                  </div>
                  <div className="w-32 h-48 mx-auto">
                    <img
                      src="/breaking-bad.png"
                      alt="Craft Materials"
                      className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick("/breaking-bad.png", "Craft Materials")}
                    />
                  </div>
                  <div className="w-32 h-48 mx-auto">
                    <img
                      src="/better-call.png"
                      alt="Plush Characters"
                      className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick("/better-call.png", "Plush Characters")}
                    />
                  </div>
                </div>
              </section>

              {/* Footer with craft aesthetic */}
              <footer className="card p-4 md:p-6 text-center space-y-4">
                <div className="flex justify-center items-center gap-2 md:gap-4 flex-wrap">
                  <span className="text-xl md:text-2xl">🧸</span>
                  <span className="text-xl md:text-2xl">✂️</span>
                  <span className="text-xl md:text-2xl">🧵</span>
                  <span className="text-xl md:text-2xl">🎨</span>
                  <span className="text-xl md:text-2xl">✨</span>
                </div>
                <p className="text-xs md:text-sm opacity-60 max-w-2xl mx-auto px-2">
                  Sackboy Studio uses OpenAI image generation to create magical transformations.
                  We describe a "knitted burlap plush craft" style inspired by the wonderful world of LittleBigPlanet,
                  avoiding trademarks while celebrating the creative spirit of the franchise.
                </p>
                <p className="text-xs opacity-40 px-2 break-all">
                  Made with ❤️ for the $Sackboys community • Not affiliated with Sony or Media Molecule
                  <br/>CA: 5umdEnYVe9c7YsGWzBAW1xbBGYDF6BwW8qruFmmPbonk
                </p>
              </footer>
            </main>
        )}

        {/* Enhanced Image Modal */}
        {modalImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setModalImage(null)}
          >
            <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col">
              <img
                src={modalImage.src}
                alt={modalImage.alt}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Image title */}
              <div className="text-center mt-4 text-white">
                <p className="text-lg font-medium">{modalImage.alt}</p>
                <p className="text-sm opacity-75 mt-1">Click anywhere to close</p>
              </div>

              {/* Close button */}
              <button
                onClick={() => setModalImage(null)}
                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-colors text-xl font-bold"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </>
  );
}
