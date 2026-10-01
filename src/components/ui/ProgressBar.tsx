interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
  height?: number;
}

/**
 * Horizontal progress bar. The percentage sits to the right of the track rather than on it,
 * so it stays readable whatever the fill level.
 */
export default function ProgressBar({ value, showLabel = true, height = 12 }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, value));
  const displayValue = `${percentage.toFixed(1)}%`;

  return (
    <div className="flex w-full items-center gap-3">
      <div
        className="relative flex-1 overflow-hidden rounded-full bg-surface-3"
        style={{ height }}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={showLabel ? undefined : displayValue}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="w-14 shrink-0 text-right text-ui font-semibold tabular-nums text-fg">{displayValue}</span>
      )}
    </div>
  );
}
