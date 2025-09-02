import { NextRequest, NextResponse } from 'next/server';
import { buildPrompt } from '@/lib/prompt';
import { parseForm } from '@/lib/validation';
import { maybeStoreImage } from '@/lib/image';

export const runtime = 'edge';

/**
 * Edge API route for image stylisation. Accepts multipart form data with
 * the uploaded image and control values, constructs a prompt and forwards
 * the request to the OpenAI Images API. Optionally stores the result in
 * Vercel Blob when requested.
 */
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const form = await req.formData();
    const { file, size, styleStrength, diorama, keepPrivate, customPrompt } = await parseForm(form);

    const prompt = buildPrompt({ styleStrength, diorama, customPrompt });

    const fd = new FormData();
    fd.append('model', 'gpt-image-1');
    fd.append('prompt', prompt);
    fd.append('size', size);
    // Note: we always send a PNG blob; data cleaning is done client side.
    fd.append('image', file as unknown as Blob, 'upload.png');

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` || '' },
      body: fd
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({} as any));
      const msg = err?.error?.message || `OpenAI error (${res.status})`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json as string | undefined;
    if (!b64) {
      return NextResponse.json({ error: 'No image returned.' }, { status: 502 });
    }

    let imageUrl: string | undefined;
    if (!keepPrivate) {
      try {
        imageUrl = await maybeStoreImage(b64, `stylized-${Date.now()}.png`);
      } catch {
        // ignore storage errors
      }
    }

    const timingMs = Date.now() - t0;
    return NextResponse.json({
      imageBase64: `data:image/png;base64,${b64}`,
      imageUrl,
      meta: { size, styleStrength, diorama, timingMs }
    });
  } catch (e: any) {
    const message = e?.message || 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
