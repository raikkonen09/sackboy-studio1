export type StylizeResponse = {
  imageBase64: string;
  imageUrl?: string;
  meta: {
    size: '512' | '768' | '1024';
    styleStrength: 'low' | 'medium' | 'high';
    diorama: boolean;
    timingMs: number;
  };
};