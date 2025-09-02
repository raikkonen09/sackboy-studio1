import { z } from 'zod';

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp'] as const;

/**
 * Parses and validates the multipart form data submitted to the API. Ensures
 * the uploaded file meets type/size requirements and coerces controls.
 */
export async function parseForm(form: FormData) {
  const file = form.get('image');
  if (!file || !(file instanceof Blob)) throw new Error('Missing image.');
  const size = form.get('size')?.toString() || '1024x1024';
  const styleStrength = form.get('styleStrength')?.toString() || 'medium';
  const diorama = form.get('diorama')?.toString() === 'true';
  const keepPrivate = form.get('private')?.toString() !== 'false';
  const customPrompt = form.get('customPrompt')?.toString() || '';

  const FileSchema = z.object({
    type: z.enum(ACCEPT as any),
    size: z.number().max(8 * 1024 * 1024)
  });
  FileSchema.parse({ type: (file as any).type, size: (file as any).size });

  const SizeSchema = z.enum(['1024x1024', '1024x1536', '1536x1024', 'auto']);
  const StyleSchema = z.enum(['low', 'medium', 'high']);

  return {
    file: file as File,
    size: SizeSchema.parse(size),
    styleStrength: StyleSchema.parse(styleStrength),
    diorama,
    keepPrivate,
    customPrompt
  } as const;
}

/**
 * Client-side validation for uploaded files. Returns an error string or null.
 */
export function validateUpload(file: File): string | null {
  const allowed = ACCEPT as unknown as string[];
  if (!allowed.includes(file.type)) return 'Please upload a PNG, JPG, or WebP image.';
  if (file.size > 8 * 1024 * 1024) return 'Image is too large (max 8 MB).';
  return null;
}
