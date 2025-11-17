'use client';

interface SpinnerProps {
  size?: number;
  color?: string;
}

export default function Spinner({ size = 20, color = '#AC66DA' }: SpinnerProps) {
  return (
    <div
      className="inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent"
      style={{
        width: size,
        height: size,
        color,
        borderColor: color,
        borderRightColor: 'transparent',
      }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

