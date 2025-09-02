import { NextRequest, NextResponse } from 'next/server';
import { buildPrompt } from '@/lib/prompt';
import { parseForm } from '@/lib/validation';
import { maybeStoreImage } from '@/lib/image';

export const runtime = 'edge';

const OPENAI_URL = 'https://api.openai.com/v1/images/edits';
const MAX_PER_REQUEST = 10;        // OpenAI limit per call
const MAX_TOTAL = 100;             // safety cap (tweak as you like)

/**
 * Edge API route for image stylisation.
 * - Keeps the original single-image behavior.
 * - Adds parallel batching when the client sends `n` > 1 in the multipart form.
 */
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const form = await req.formData();
    const {
      file,
      size,
      styleStrength,
      diorama,
      keepPrivate,
      customPrompt,
    } = await parseForm(form);

    // Read n from form (optional). Default to 1 (original behavior).
    let n = Number(form.get('n') || 1);
    if (!Number.isFinite(n) || n < 1) n = 1;
    n = Math.min(n, MAX_TOTAL);

    const prompt = buildPrompt({ styleStrength, diorama, customPrompt });

    // ---------- Single-image (original) path ----------
    if (n === 1) {
      const fd = new FormData();
      fd.append('model', 'gpt-image-1');
      fd.append('prompt', prompt);
      fd.append('size', size);
      // Note: we always send a PNG blob; data cleaning is done client side.
      fd.append('image', file as unknown as Blob, 'upload.png');

      const res = await fetch(OPENAI_URL, {
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
        meta: { size, styleStrength, diorama, timingMs, requested: 1, returned: 1 }
      });
    }

    // ---------- Multi-image parallel batching ----------
    // Split total n into chunks of up to 10 per request
    const batches: number[] = [];
    {
      let remaining = n;
      while (remaining > 0) {
        const take = Math.min(MAX_PER_REQUEST, remaining);
        batches.push(take);
        remaining -= take;
      }
    }

    const authHeader = { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}` };

    const requests = batches.map(async (count) => {
      const fd = new FormData();
      fd.append('model', 'gpt-image-1');
      fd.append('prompt', prompt);
      fd.append('size', size);
      fd.append('n', String(count));
      fd.append('image', file as unknown as Blob, 'upload.png');

      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: authHeader,
        body: fd
      });

      if (!res.ok) {
        // fail-fast with best possible error
        let msg = `OpenAI error (${res.status})`;
        try {
          const err = await res.json();
          msg = err?.error?.message || msg;
        } catch {
          try {
            msg = await res.text();
          } catch {}
        }
        throw new Error(msg);
      }

      const data = await res.json();
      const images: string[] = (data?.data || [])
          .map((it: any) => it?.b64_json)
          .filter(Boolean);
      return images;
    });

    const results = await Promise.all(requests);
    const allB64: string[] = results.flat();

    if (allB64.length === 0) {
      return NextResponse.json({ error: 'No images returned.' }, { status: 502 });
    }

    // Optionally store each image if not private
    let imageUrls: (string | undefined)[] = new Array(allB64.length).fill(undefined);
    if (!keepPrivate) {
      imageUrls = await Promise.all(
          allB64.map(async (b64, idx) => {
            try {
              return await maybeStoreImage(b64, `stylized-${Date.now()}-${idx}.png`);
            } catch {
              return undefined; // ignore storage errors
            }
          })
      );
    }

    const timingMs = Date.now() - t0;

    // Backward-compatible fields (first image), plus arrays for multi
    return NextResponse.json({
      imageBase64: `data:image/png;base64,${allB64[0]}`,
      imageUrl: imageUrls[0],
      imagesBase64: allB64.map(b64 => `data:image/png;base64,${b64}`),
      imageUrls,
      meta: {
        size,
        styleStrength,
        diorama,
        requested: n,
        returned: allB64.length,
        timingMs
      }
    });

  } catch (e: any) {
    const message = e?.message || 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
