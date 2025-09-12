import { z } from 'zod';

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp'] as const; // Back to original formats
const MAX_SIZE = 8 * 1024 * 1024; // Back to 8 MB

/**
 * Parses and validates the multipart form data submitted to the API. Ensures
 * the uploaded file meets type/size requirements and coerces controls.
 */
export async function parseForm(form: FormData) {
  const file = form.get('image');
  const size = form.get('size')?.toString() || '1024x1024';
  const styleStrength = form.get('styleStrength')?.toString() || 'medium';
  const diorama = form.get('diorama')?.toString() === 'true';
  const keepPrivate = form.get('private')?.toString() !== 'false';
  const customPrompt = form.get('customPrompt')?.toString() || '';
  const removeCaptions = form.get('removeCaptions')?.toString() === 'true';
  const generationMode = form.get('generationMode')?.toString() || 'transform';

  // For random_crypto and pokemon_card modes, we don't need an uploaded file
  if (generationMode !== 'random_crypto' && generationMode !== 'pokemon_card') {
    if (!file || !(file instanceof Blob)) throw new Error('Missing image.');

    const FileSchema = z.object({
      type: z.enum(ACCEPT as any),
      size: z.number().max(MAX_SIZE)
    });
    FileSchema.parse({ type: (file as any).type, size: (file as any).size });
  }

  const SizeSchema = z.enum(['1024x1024', '1024x1536', '1536x1024', 'auto']);
  const StyleSchema = z.enum(['low', 'medium', 'high']);
  const GenerationModeSchema = z.enum(['transform', 'add_sackboy', 'random_crypto', 'pokemon_card']);

  return {
    file: file as File | null,
    size: SizeSchema.parse(size),
    styleStrength: StyleSchema.parse(styleStrength),
    diorama,
    keepPrivate,
    customPrompt,
    removeCaptions,
    generationMode: GenerationModeSchema.parse(generationMode)
  } as const;
}

/**
 * Client-side validation for uploaded files. Returns an error string or null.
 */
export function validateUpload(file: File): string | null {
  const allowed = ACCEPT as unknown as string[];
  if (!allowed.includes(file.type)) return 'Please upload a PNG, JPG, or WebP image.';
  if (file.size > MAX_SIZE) return 'Image is too large (max 8 MB).';
  return null;
}
