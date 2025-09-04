"use client";

/**
 * Primary call to action to trigger generation. Shows progress when busy.
 */
export default function GenerateButton({
  disabled,
  loading,
  progress,
  progressMessage,
  onClick
}: {
  disabled?: boolean;
  loading?: boolean;
  progress?: number;
  progressMessage?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="btn w-full justify-center"
      disabled={disabled}
      onClick={onClick}
      aria-live="polite"
    >
      {loading ? (
        <span>
          {progressMessage || 'Generating...'} {progress ?? 0}%
        </span>
      ) : (
        <span>Generate</span>
      )}
    </button>
  );
}
