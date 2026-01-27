interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
  height?: number;
}

export default function ProgressBar({ value, showLabel = true, height = 32 }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, value));
  const displayValue = percentage.toFixed(1);
  
  return (
    <div
      className="relative w-full rounded-full overflow-hidden"
      style={{ backgroundColor: '#E7E4E4', height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          backgroundColor: 'var(--accent-purple)',
          width: `${percentage}%`,
        }}
      />
      {showLabel && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span className="text-sm font-bold" style={{ color: '#282828' }}>
            {displayValue}%
          </span>
        </div>
      )}
    </div>
  );
}

