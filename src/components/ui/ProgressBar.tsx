interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
}

export default function ProgressBar({ value, showLabel = true }: ProgressBarProps) {
  return (
    <div className="relative w-full h-8 rounded-full overflow-hidden" style={{ backgroundColor: '#E7E4E4' }}>
      <div
        className="h-full rounded-full flex items-center justify-center transition-all duration-500"
        style={{
          backgroundColor: 'var(--accent-purple)',
          width: `${Math.min(100, Math.max(0, value))}%`,
        }}
      >
        {showLabel && value >= 50 && (
          <span className="text-xs font-semibold" style={{ color: '#282828' }}>
            % {value.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}

