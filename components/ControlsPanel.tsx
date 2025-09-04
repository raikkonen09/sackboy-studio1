"use client";

import { useEffect, useState } from 'react';
import clsx from 'clsx';

export type ControlsValues = {
  size: '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
  styleStrength: 'low' | 'medium' | 'high';
  diorama: boolean;
  keepPrivate: boolean;
  customPrompt: string;
  removeCaptions: boolean;
  generationMode: 'transform' | 'add_sackboy' | 'random_crypto';
};

// Helper function to get display label for size
function getSizeLabel(size: string): string {
  switch (size) {
    case '1024x1024':
      return '1:1';
    case '1024x1536':
      return '2:3';
    case '1536x1024':
      return '3:2';
    case 'auto':
      return 'Auto';
    default:
      return size;
  }
}

/**
 * Panel of controls to tune the generation: size, style strength,
 * optional diorama background and privacy toggle. Exposes the current
 * values via onChange.
 */
export default function ControlsPanel({ onChange }: { onChange: (v: ControlsValues) => void }) {
  const [values, setValues] = useState<ControlsValues>({
    size: '1024x1024',
    styleStrength: 'medium',
    diorama: false,
    keepPrivate: true,
    customPrompt: '',
    removeCaptions: false,
    generationMode: 'transform'
  });

  useEffect(() => {
    onChange(values);
    // Return undefined explicitly to avoid cleanup function issues
    return undefined;
  }, [values, onChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Output Size</label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {(['1024x1024', '1024x1536', '1536x1024', 'auto'] as const).map((s) => (
            <button
              key={s}
              className={clsx('btn', values.size === s && 'ring-2 ring-accent/70')}
              onClick={() => setValues((v) => ({ ...v, size: s }))}
            >
              {getSizeLabel(s)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Style Strength</label>
        <select
          className="input mt-2 w-full"
          value={values.styleStrength}
          onChange={(e) =>
            setValues((v) => ({ ...v, styleStrength: e.target.value as any }))
          }
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div>
        <label className="label">Custom Prompt (Optional)</label>
        <textarea
          className="input mt-2 w-full"
          placeholder="Add extra details or specific styling instructions..."
          value={values.customPrompt}
          onChange={(e) =>
            setValues((v) => ({ ...v, customPrompt: e.target.value }))
          }
          rows={3}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="diorama"
          type="checkbox"
          checked={values.diorama}
          onChange={(e) =>
            setValues((v) => ({ ...v, diorama: e.target.checked }))
          }
        />
        <label htmlFor="diorama">Craft Diorama Background</label>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="keepPrivate"
          type="checkbox"
          checked={values.keepPrivate}
          onChange={(e) =>
            setValues((v) => ({ ...v, keepPrivate: e.target.checked }))
          }
        />
        <label htmlFor="keepPrivate">Keep my image private (no server storage)</label>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="removeCaptions"
          type="checkbox"
          checked={values.removeCaptions}
          onChange={(e) =>
            setValues((v) => ({ ...v, removeCaptions: e.target.checked }))
          }
        />
        <label htmlFor="removeCaptions">Remove Captions</label>
      </div>

      <div>
        <label className="label">Generation Mode</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(['transform', 'add_sackboy', 'random_crypto'] as const).map((mode) => (
            <button
              key={mode}
              className={clsx('btn text-xs', values.generationMode === mode && 'ring-2 ring-accent/70')}
              onClick={() => setValues((v) => ({ ...v, generationMode: mode }))}
            >
              {mode === 'transform' ? 'Transform All' : mode === 'add_sackboy' ? 'Add Sackboy' : 'Random Sackboy'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
