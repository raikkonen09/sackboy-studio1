export type PromptOptions = {
  styleStrength: 'low' | 'medium' | 'high';
  diorama: boolean;
  customPrompt?: string;
  removeCaptions?: boolean;
  generationMode?: 'transform' | 'add_sackboy';
};

/**
 * Constructs a prompt for the OpenAI image model based on the given
 * options. Uses neutral descriptive language to avoid trademarks.
 */
export function buildPrompt({ styleStrength, diorama, customPrompt, removeCaptions = false, generationMode = 'transform' }: PromptOptions) {
  const parts: string[] = [];

  // Base prompt changes based on generation mode
  if (generationMode === 'add_sackboy') {
    parts.push(
      'Add a single Sackboy character from Little Big Planet into the uploaded image, with burlap plush textures, yarn stitching, and button-like eyes.',
      'The Sackboy should blend naturally into the existing scene and environment.',
      'Preserve the original characters and composition exactly as they are.',
      'Ensure that the overall image style, lighting, and atmosphere remain faithful to the source photo.',
      'The added Sackboy should have cozy handcrafted aesthetics: knit seams, soft felt surfaces, subtle fabric fraying, photorealistic craft materials.'
    );
  } else {
    parts.push(
      'Transform all characters from the uploaded image into Sackboy-style figures from Little Big Planet, with burlap plush textures, yarn stitching, and button-like eyes.',
      'Preserve each subject\'s unique facial expression, posture, identity, and the original environment and composition.',
      'Ensure that the overall image style, lighting, and atmosphere remain faithful to the source photo.',
      'Emphasize cozy handcrafted aesthetics: knit seams, soft felt surfaces, subtle fabric fraying, photorealistic craft materials.'
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

  // Add custom prompt if provided
  if (customPrompt && customPrompt.trim()) {
    parts.push(customPrompt.trim());
  }

  return parts.join(' ');
}
