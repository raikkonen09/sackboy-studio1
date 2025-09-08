export type PromptOptions = {
  styleStrength: 'low' | 'medium' | 'high';
  diorama: boolean;
  customPrompt?: string;
  removeCaptions?: boolean;
  generationMode?: 'transform' | 'add_sackboy' | 'random_crypto';
};

/**
 * Constructs a prompt for the OpenAI image model based on the given
 * options. Uses neutral descriptive language to avoid trademarks.
 */
export function buildPrompt({ styleStrength, diorama, customPrompt, removeCaptions = false, generationMode = 'transform' }: PromptOptions) {
  // If custom prompt is provided, use it entirely and ignore other settings except style strength
  if (customPrompt && customPrompt.trim()) {
    const parts: string[] = [];
    parts.push(customPrompt.trim());

    // Still apply style strength to custom prompts
    if (styleStrength === 'low') parts.push('Subtle Sackboy stylisation; delicate knit and stitch overlay without overpowering realism.');
    if (styleStrength === 'medium') parts.push('Moderate Sackboy stylisation; clear burlap and stitched plush qualities visible.');
    if (styleStrength === 'high') parts.push('Strong Sackboy stylisation; pronounced knit textures, bold seams, and toy-like craft details.');

    return parts.join(' ');
  }

  // For random_crypto, we'll generate the prompt using OpenAI Responses API
  // This function won't be called for that mode
  if (generationMode === 'random_crypto') {
    throw new Error('Random crypto prompts should be generated via OpenAI Responses API');
  }

  // Default prompt building for transform and add_sackboy modes
  const parts: string[] = [];

  // Base prompt changes based on generation mode
  if (generationMode === 'add_sackboy') {
    parts.push(
      'Add a single Sackboy character from Little Big Planet into the uploaded image, with burlap plush textures, yarn stitching, and button-like eyes.',
      'The Sackboy should blend naturally into the existing scene and environment.',
      'Preserve the original characters and composition exactly as they are.',
      'Maybe if there is the case for that, replace a secondary object from the image with a sackboy instead of directly adding the sackboy to the image. For example, if the main character holds something in its hand, it can be replaced. Or if the main character showcases the secondary object in a way. Shouldnt always be the case',
      'Ensure that the overall image style, lighting, and atmosphere remain faithful to the source photo.',
      'The added Sackboy should have cozy handcrafted aesthetics: knit seams, soft felt surfaces, subtle fabric fraying, photorealistic craft materials.'
    );
  } else {
    parts.push(
      'Transform all characters from the uploaded image into Sackboy-style figures from Little Big Planet, with burlap plush textures, yarn stitching, and button-like eyes.',
      'Preserve each subject\'s unique facial expression, posture, identity, and the original environment and composition.',
      'Ensure that the overall image style, lighting, and atmosphere remain faithful to the source photo.',
      'Emphasize cozy handcrafted aesthetics: knit seams, soft felt surfaces, subtle fabric fraying, photorealistic craft materials. Keep it easily relatable to original image'
    );
  }

  // Caption removal instruction
  if (removeCaptions) {
    parts.push('Remove any existing captions or overlaid text, leaving clean space so a new caption can be added later.');
  }

  // Common ending
  parts.push('No text, no logos, no watermarks, no trademarks.');

  if (styleStrength === 'low') parts.push('Subtle Sackboy stylisation; delicate knit and stitch overlay without overpowering realism.');
  if (styleStrength === 'medium') parts.push('Moderate Sackboy stylisation; clear burlap and stitched plush qualities visible.');
  if (styleStrength === 'high') parts.push('Strong Sackboy stylisation; pronounced knit textures, bold seams, and toy-like craft details.');
  if (diorama)
    parts.push(
        'Optional setting: a handcrafted tabletop diorama with felt scenery, cardboard props, yarn textures, and warm bokeh craft lights.'
    );

  return parts.join(' ');
}
