export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(amount: number, withDecimals = true): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  });
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

export function formatPercentage(value: number, includeSign = false): string {
  const sign = includeSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

