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
 * Formats a number smartly:
 * - If >= 10, shows 2 decimals.
 * - If < 10, shows up to 8 decimals (for precision assets like Dogecoin/BTC).
 */
export function formatSmartNumber(value: number): string {
  const absValue = Math.abs(value);
  const maxDecimals = absValue < 10 ? 8 : 2;
  
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
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

/**
 * Formats a number in a compact way (e.g., 1.2K, 10.4M) to avoid UI overflow.
 * Used for large totals in cards.
 */
export function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  
  // For numbers under 1,000,000, keep decimals if small, otherwise whole number
  if (absValue < 1000000) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: absValue < 1000 ? 2 : 0,
    });
  }
  
  // For anything over 1M, use compact notation (M, B, T)
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}

