import { NextRequest } from 'next/server';
import { buildPrompt } from '@/lib/prompt';
import { parseForm } from '@/lib/validation';
import { maybeStoreImage } from '@/lib/image';

export const runtime = 'edge';

const OPENAI_URL = 'https://api.openai.com/v1/images/edits';

/**
 * Streaming API route for image stylization with real-time progress updates
 * Uses OpenAI's native streaming with gpt-image-1 model
 */
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const t0 = Date.now();

      try {
        // Send initial progress
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          message: 'Parsing request...',
          progress: 5
        })}\n\n`));

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
          controller.close();
          return;
        }

        // Send API request start
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          message: 'Starting OpenAI transformation...',
          progress: 10
        })}\n\n`));

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
        // Use array notation as shown in OpenAI docs
        fd.append('image[]', file as unknown as Blob, 'upload.png');

        const res = await fetch(OPENAI_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: fd
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({} as any));
          const msg = err?.error?.message || `OpenAI error (${res.status})`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: msg
          })}\n\n`));
          controller.close();
          return;
        }

        // Process OpenAI's streaming response
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'No streaming response available'
          })}\n\n`));
          controller.close();
          return;
        }

        let buffer = '';
        let finalImage: string | undefined;
        let partialCount = 0;

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
            if (line.startsWith('event: ')) {
              const event = line.slice(7).trim();
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

                    // Forward partial image to client
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

        if (!finalImage) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'No final image received from OpenAI'
          })}\n\n`));
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

        controller.close();

      } catch (e: any) {
        console.error('Streaming API error:', e);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: e?.message || 'Generation failed'
        })}\n\n`));
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
