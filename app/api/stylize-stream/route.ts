import { NextRequest } from 'next/server';
import { buildPrompt } from '@/lib/prompt';
import { parseForm } from '@/lib/validation';
import { maybeStoreImage } from '@/lib/image';

export const runtime = 'edge';

const OPENAI_URL = 'https://api.openai.com/v1/images/edits';

/**
 * Streaming API route for image stylization with real-time progress updates
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

        // Send validation complete
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          message: 'Building prompt...',
          progress: 15
        })}\n\n`));

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
          message: 'Sending request to OpenAI...',
          progress: 25
        })}\n\n`));

        const fd = new FormData();
        fd.append('prompt', prompt);
        fd.append('size', size);
        fd.append('response_format', 'b64_json');
        fd.append('image', file as unknown as Blob, 'upload.png');

        // Send processing update
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          message: 'OpenAI is generating your image...',
          progress: 50
        })}\n\n`));

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

        // Send processing complete
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          message: 'Processing response...',
          progress: 80
        })}\n\n`));

        const data = await res.json();
        const b64 = data?.data?.[0]?.b64_json as string | undefined;

        if (!b64) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: 'No image returned from OpenAI'
          })}\n\n`));
          controller.close();
          return;
        }

        // Send storage update
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          message: 'Finalizing...',
          progress: 90
        })}\n\n`));

        let imageUrl: string | undefined;
        if (!keepPrivate) {
          try {
            imageUrl = await maybeStoreImage(b64, `stylized-${Date.now()}.png`);
          } catch (error) {
            console.error('Image storage error:', error);
            // ignore storage errors
          }
        }

        const timingMs = Date.now() - t0;

        // Send final result
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          data: {
            imageBase64: `data:image/png;base64,${b64}`,
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
