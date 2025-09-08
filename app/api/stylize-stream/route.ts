import { NextRequest } from 'next/server';
import { buildPrompt } from '@/lib/prompt';
import { parseForm } from '@/lib/validation';
import { maybeStoreImage } from '@/lib/image';

export const runtime = 'edge';

const OPENAI_URL = 'https://api.openai.com/v1/images/edits';
const REQUEST_TIMEOUT = 800000; // 60 seconds timeout

/**
 * Streaming API route for image stylization with real-time progress updates
 * Uses OpenAI's native streaming with gpt-image-1 model
 */
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const t0 = Date.now();
      let abortController = new AbortController();
      let timeoutId: NodeJS.Timeout | null = null;
      let progressInterval: NodeJS.Timeout | null = null;
      let currentProgress = 10;

      // Set up timeout to prevent hanging requests
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (progressInterval) clearInterval(progressInterval);
        if (!abortController.signal.aborted) {
          abortController.abort();
        }
      };

      // Helper function to send progress updates
      const sendProgress = (progress: number, message: string) => {
        currentProgress = progress;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          message,
          progress
        })}\n\n`));
      };

      try {
        // Set timeout for the entire operation
        timeoutId = setTimeout(() => {
          console.log('Request timeout - aborting OpenAI call');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Request timeout - generation took too long'
          })}\n\n`));
          cleanup();
          controller.close();
        }, REQUEST_TIMEOUT);

        // Send initial progress
        sendProgress(5, 'Parsing request...');

        const form = await req.formData();
        const {
          file,
          size,
          styleStrength,
          diorama,
          keepPrivate,
          customPrompt,
          removeCaptions,
          generationMode,
        } = await parseForm(form);

        // Check for API key
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'OpenAI API key not configured'
          })}\n\n`));
          cleanup();
          controller.close();
          return;
        }

        // Handle random crypto generation (no image editing, use gpt-image-1 generation)
        if (generationMode === 'random_crypto') {
          sendProgress(10, 'Generating creative prompt...');

          // First, generate a creative memecoin prompt using OpenAI Responses API
          const promptGenerationRes = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              "input": "Generate a random, funny, and imaginative image prompt featuring Sackboy from the video game Little Big Planet. In every generated prompt, clearly describe Sackboy himself in detail: a small, knitted burlap plush toy with visible stitched seams, a zipper chest detail, yarn textures, and button-like eyes. His world is playful and handcrafted, with cardboard sets, stickers, patchwork landscapes, felt props, and DIY gadgets. Place Sackboy in absurd, meme-worthy situations that sometimes (not always) mix his video games lore with crypto/memecoin culture. Each prompt should feel unpredictable, funny, and slightly chaotic, while staying true to Sackboy’s toy-like charm. Use maximum one crypto slang term or symbol per prompt (e.g.,‘diamond hands,’ ‘pump’, ‘whale’, 'hodl', 'chad', etc. Be creative ). Crypto should be randomly, but not always included in the prompt. Sometimes (but not always), include a playful nod to Bonk memecoin or Bonk Shiba Inu Dog, or Bonk Logo. The prompt should always describe Sackboy in detail, the scene, the setting, and Sackboy’s activity, making it humorous, detailed, and meme-worthy. It mostly should be meme-worthy, while making references existing popular memes, or being new creative and viral worthy memes. Do not include captions"
            }),
            signal: abortController.signal
          });

          if (!promptGenerationRes.ok) {
            const errorData = await promptGenerationRes.json().catch(() => ({}));
            throw new Error(`Failed to generate creative prompt: ${errorData?.error?.message || 'Unknown error'}`);
          }

          const promptData = await promptGenerationRes.json();
          const generatedPrompt = promptData.output?.[0]?.content?.[0]?.text?.trim();

          if (!generatedPrompt) {
            throw new Error('No prompt generated from OpenAI Responses API');
          }

          console.log('Generated crypto prompt:', generatedPrompt);
          sendProgress(20, 'Creating Sackboy memecoin artwork...');

          // Start intermediate progress updates while waiting for image generation
          progressInterval = setInterval(() => {
            if (currentProgress < 85) {
              const increment = Math.random() * 5 + 2; // Random increment between 2-7
              const newProgress = Math.min(currentProgress + increment, 85);
              const messages = [
                'Crafting memecoin vibes...',
                'Adding crypto elements...',
                'Styling Sackboy design...',
                'Rendering creative details...',
                'Almost ready...'
              ];
              const message = messages[Math.floor(Math.random() * messages.length)];
              sendProgress(Math.floor(newProgress), message);
            }
          }, 2000); // Update every 800ms

          // Now use gpt-image-1 to generate the image with streaming
          const imageGenerationRes = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-image-1',
              prompt: generatedPrompt,
              size: size === 'auto' ? '1024x1024' : size,
              quality: 'high',
              output_format: 'png',
              background: 'auto',
              stream: true,
              n: 1
            }),
            signal: abortController.signal
          });

          // Clear the progress interval once we get a response
          if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }

          if (!imageGenerationRes.ok) {
            const err = await imageGenerationRes.json().catch(() => ({} as any));
            const msg = err?.error?.message || `gpt-image-1 error (${imageGenerationRes.status})`;
            throw new Error(msg);
          }

          sendProgress(90, 'Processing image generation...');

          // Process gpt-image-1's streaming response (similar to image editing)
          const reader = imageGenerationRes.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('No streaming response available');
          }

          let buffer = '';
          let finalImage: string | undefined;
          let partialCount = 0;
          let hasReceivedData = false;

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                console.log('gpt-image-1 stream completed');
                break;
              }

              hasReceivedData = true;

              // Append new chunk to buffer
              buffer += decoder.decode(value, { stream: true });

              // Process complete lines from buffer
              const lines = buffer.split('\n');

              // Keep the last (potentially incomplete) line in buffer
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  continue;
                }

                if (line.startsWith('data: ')) {
                  try {
                    const jsonStr = line.slice(6).trim();
                    if (jsonStr) {
                      const data = JSON.parse(jsonStr);

                      if (data.type === 'image_generation.partial_image') {
                        partialCount++;
                        const progress = Math.min(40 + (partialCount * 15), 85);

                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          type: 'partial',
                          data: {
                            imageBase64: `data:image/png;base64,${data.b64_json}`,
                            partialIndex: data.partial_image_index || partialCount
                          },
                          progress: progress,
                          message: `Generating... (partial ${partialCount})`
                        })}\n\n`));

                      } else if (data.type === 'image_generation.completed') {
                        finalImage = data.b64_json;
                        console.log('gpt-image-1 generation completed');

                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          type: 'progress',
                          message: 'Finalizing...',
                          progress: 90
                        })}\n\n`));
                      }
                    }
                  } catch (parseError) {
                    console.error('Error parsing gpt-image-1 SSE data:', parseError);
                  }
                }
              }
            }
          } finally {
            // Always close the reader
            reader.releaseLock();
          }

          if (!finalImage && hasReceivedData) {
            console.error('No final image received despite getting data');
            throw new Error('Generation incomplete - no final image received');
          }

          if (!finalImage) {
            console.error('No data received from gpt-image-1');
            throw new Error('No response received from gpt-image-1');
          }

          // Handle image storage
          let imageUrl: string | undefined;
          if (!keepPrivate) {
            try {
              imageUrl = await maybeStoreImage(finalImage, `random-crypto-${Date.now()}.png`);
            } catch (error) {
              console.error('Image storage error:', error);
            }
          }

          const timingMs = Date.now() - t0;
          console.log(`Random crypto generation completed in ${timingMs}ms`);

          // Send final result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            data: {
              imageBase64: `data:image/png;base64,${finalImage}`,
              imageUrl,
              meta: { size, generatedPrompt, timingMs }
            },
            progress: 100
          })}\n\n`));

          cleanup();
          controller.close();
          return;
        }
        sendProgress(10, 'Starting OpenAI transformation...');

        // Original image editing logic for transform and add_sackboy modes
        if (!file) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Image file required for this generation mode'
          })}\n\n`));
          cleanup();
          controller.close();
          return;
        }

        const prompt = buildPrompt({ styleStrength, diorama, customPrompt, removeCaptions, generationMode });

        // Send API request start
        sendProgress(10, 'Starting OpenAI transformation...');

        // Create FormData with proper array notation for images
        const fd = new FormData();
        fd.append('model', 'gpt-image-1');
        fd.append('prompt', prompt);
        fd.append('size', size);
        fd.append('input_fidelity', styleStrength === 'low' ? 'low' : 'high');
        fd.append('quality', 'high');
        fd.append('output_format', 'png');
        fd.append('background', 'auto');
        fd.append('stream', 'true');
        fd.append('image[]', file as unknown as Blob, 'upload.png');

        console.log('Making OpenAI API call...', { prompt: prompt.substring(0, 100) + '...' });

        sendProgress(15, 'Connecting to OpenAI...');

        // Start intermediate progress updates during the API call
        progressInterval = setInterval(() => {
          if (currentProgress < 70) {
            const increment = Math.random() * 3 + 1; // Random increment between 1-4
            const newProgress = Math.min(currentProgress + increment, 90);
            const messages = [
              'Processing your image...',
              'Analyzing composition...',
              'Applying Sackboy transformation...',
              'Generating craft textures...',
              'Adding knitted details...',
              'Creating plush aesthetics...',
              'Rendering burlap textures...',
              'Almost there...'
            ];
            const message = messages[Math.floor(Math.random() * messages.length)];
            sendProgress(Math.floor(newProgress), message);
          }
        }, 2000); // Update every 2 seconds

        const res = await fetch(OPENAI_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: fd,
          signal: abortController.signal // Add abort signal
        });

        // Clear the progress interval once we get a response
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({} as any));
          const msg = err?.error?.message || `OpenAI error (${res.status})`;
          console.error('OpenAI API error:', msg);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: msg
          })}\n\n`));
          cleanup();
          controller.close();
          return;
        }

        sendProgress(95, 'Receiving generated image...');

        // Process OpenAI's streaming response
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'No streaming response available'
          })}\n\n`));
          cleanup();
          controller.close();
          return;
        }

        let buffer = '';
        let finalImage: string | undefined;
        let partialCount = 0;
        let hasReceivedData = false;

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log('OpenAI stream completed');
              break;
            }

            hasReceivedData = true;

            // Append new chunk to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete lines from buffer
            const lines = buffer.split('\n');

            // Keep the last (potentially incomplete) line in buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                continue;
              }

              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr) {
                    const data = JSON.parse(jsonStr);

                    if (data.type === 'image_edit.partial_image') {
                      partialCount++;
                      const progress = Math.min(20 + (partialCount * 15), 80);

                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'partial',
                        data: {
                          imageBase64: `data:image/png;base64,${data.b64_json}`,
                          partialIndex: data.partial_image_index || partialCount
                        },
                        progress: progress,
                        message: `Generating... (partial ${partialCount})`
                      })}\n\n`));

                    } else if (data.type === 'image_edit.completed') {
                      finalImage = data.b64_json;
                      console.log('OpenAI generation completed');

                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'progress',
                        message: 'Finalizing...',
                        progress: 90
                      })}\n\n`));
                    }
                  }
                } catch (parseError) {
                  console.error('Error parsing OpenAI SSE data:', parseError);
                }
              }
            }
          }
        } finally {
          // Always close the reader
          reader.releaseLock();
        }

        if (!finalImage && hasReceivedData) {
          console.error('No final image received despite getting data');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Generation incomplete - no final image received'
          })}\n\n`));
          cleanup();
          controller.close();
          return;
        }

        if (!finalImage) {
          console.error('No data received from OpenAI');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'No response received from OpenAI'
          })}\n\n`));
          cleanup();
          controller.close();
          return;
        }

        // Handle image storage
        let imageUrl: string | undefined;
        if (!keepPrivate) {
          try {
            imageUrl = await maybeStoreImage(finalImage, `stylized-${Date.now()}.png`);
          } catch (error) {
            console.error('Image storage error:', error);
          }
        }

        const timingMs = Date.now() - t0;
        console.log(`Generation completed in ${timingMs}ms`);

        // Send final result
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          data: {
            imageBase64: `data:image/png;base64,${finalImage}`,
            imageUrl,
            meta: { size, styleStrength, diorama, timingMs }
          },
          progress: 100
        })}\n\n`));

        cleanup();
        controller.close();

      } catch (e: any) {
        console.error('Streaming API error:', e);

        if (e.name === 'AbortError') {
          console.log('Request was aborted');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'Request was cancelled or timed out'
          })}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: e?.message || 'Generation failed'
          })}\n\n`));
        }

        cleanup();
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
