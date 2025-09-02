"use client";

import { useEffect, useState } from 'react';
import clsx from 'clsx';

export type ControlsValues = {
  size: '512' | '768' | '1024';
  styleStrength: 'low' | 'medium' | 'high';
  diorama: boolean;
  keepPrivate: boolean;
};

/**
 * Panel of controls to tune the generation: size, style strength,
 * optional diorama background and privacy toggle. Exposes the current
 * values via onChange.
 */
export default function ControlsPanel({ onChange }: { onChange: (v: ControlsValues) => void }) {
  const [values, setValues] = useState<ControlsValues>({
    size: '1024',
    styleStrength: 'medium',
    diorama: false,
    keepPrivate: true
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
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(['512', '768', '1024'] as const).map((s) => (
            <button
              key={s}
              className={clsx('btn', values.size === s && 'ring-2 ring-accent/70')}
              onClick={() => setValues((v) => ({ ...v, size: s }))}
            >
              {s}px
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
    </div>
  );
}
