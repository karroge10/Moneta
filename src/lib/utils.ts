// Import only the formatting function, not server-side utilities
function formatCurrencyWithCode(
  amount: number,
  currencyCode: string = 'USD',
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return `$${formatted}`;
  }
}

export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  return formatCurrencyWithCode(amount, currencyCode);
}

export function formatNumber(amount: number, withDecimals = true): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  });
}

/**
 * Format amount with currency symbol (for use when you have the symbol directly)
 * @param amount - The amount to format
 * @param symbol - The currency symbol (e.g., '$', '₾', '€')
 * @param withDecimals - Whether to include decimal places
 */
export function formatAmountWithSymbol(
  amount: number,
  symbol: string = '$',
  withDecimals = true
): string {
  const formatted = formatNumber(amount, withDecimals);
  return `${symbol}${formatted}`;
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

/**
 * Get trend color for expenses (inverted logic)
 * For expenses: negative trend (spending less) is good (green), positive (spending more) is bad (red)
 */
export function getExpenseTrendColor(value: number): string {
  return value <= 0 ? 'var(--accent-green)' : 'var(--error)';
}

export function formatPercentage(value: number, includeSign = false): string {
  const sign = includeSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

