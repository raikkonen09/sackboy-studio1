import { buildPrompt } from '@/lib/prompt';

describe('buildPrompt', () => {
  it('includes strength and diorama options', () => {
    const p = buildPrompt({ styleStrength: 'high', diorama: true });
    expect(p).toMatch(/pronounced knit/);
    expect(p).toMatch(/handcrafted tabletop diorama/);
    expect(p).toMatch(/No text/);
  });
});