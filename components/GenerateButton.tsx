"use client";

/**
 * Primary call to action to trigger generation. Shows progress when busy.
 */
export default function GenerateButton({
  disabled,
  loading,
  progress,
  onClick
}: {
  disabled?: boolean;
  loading?: boolean;
  progress?: number;
  onClick: () => void;
}) {
  return (
    <button
      className="btn w-full justify-center"
      disabled={disabled}
      onClick={onClick}
      aria-live="polite"
    >
      {loading ? <span>Generating… {progress ?? 0}%</span> : <span>Generate</span>}
    </button>
  );
}