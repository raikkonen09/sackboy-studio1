export type StylizeResponse = {
  imageBase64: string;
  imageUrl?: string;
  meta: {
    size: '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
    styleStrength: 'low' | 'medium' | 'high';
    diorama: boolean;
    timingMs: number;
  };
};
