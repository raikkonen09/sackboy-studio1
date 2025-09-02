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
        } = await parseForm(form);

        const prompt = buildPrompt({ styleStrength, diorama, customPrompt });

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
            const newProgress = Math.min(currentProgress + increment, 70);
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

        sendProgress(75, 'Receiving generated image...');

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
