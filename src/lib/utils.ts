import { formatDecimal, formatPercent } from '@/lib/format';

/** Legacy wrapper; prefer formatDecimal from '@/lib/format'. */
export function formatNumber(amount: number, withDecimals = true): string {
  const decimals = withDecimals ? 2 : 0;
  return formatDecimal(amount, { minDecimals: decimals, maxDecimals: decimals });
}

/** Legacy wrapper; prefer formatQuantity or formatDecimal from '@/lib/format'. */
export function formatSmartNumber(value: number): string {
  const maxDecimals = Math.abs(value) < 10 ? 8 : 2;
  return formatDecimal(value, { minDecimals: 2, maxDecimals });
}

export function getHealthColor(score: number): string {
  if (score >= 80) return 'var(--accent-purple)';
  if (score >= 60) return 'var(--accent-green)';
  if (score >= 40) return 'var(--text-primary)';
  return 'var(--error)';
}

export function getTrendColor(value: number): string {
  return value >= 0 ? 'var(--accent-green)' : 'var(--error)';
}


export function getExpenseTrendColor(value: number): string {
  return value <= 0 ? 'var(--accent-green)' : 'var(--error)';
}

/** Legacy wrapper; prefer formatPercent from '@/lib/format'. */
export function formatPercentage(value: number, includeSign = false): string {
  return formatPercent(value, { signed: includeSign });
}

/** Legacy wrapper; prefer formatDecimal(value, { compact: true }) from '@/lib/format'. */
export function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  if (absValue < 1000000) {
    return formatDecimal(value, { minDecimals: 0, maxDecimals: absValue < 1000 ? 2 : 0 });
  }
  return formatDecimal(value, { compact: true, maxDecimals: 1 });
}

