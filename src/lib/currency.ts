/**
 * Get default currency (USD) as fallback
 * Note: For server-side currency fetching, use getUserCurrency from a server component
 * For client-side, use the useCurrency hook
 */
export function getDefaultCurrency() {
  return {
    id: 0,
    name: 'US Dollar',
    symbol: '$',
    alias: 'USD',
  };
}

/**
 * Format amount with currency symbol
 * @param amount - The amount to format
 * @param currencySymbol - The currency symbol (e.g., '$', '₾', '€')
 * @param withDecimals - Whether to include decimal places
 */
export function formatCurrencyAmount(
  amount: number,
  currencySymbol: string,
  withDecimals = true
): string {
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  });
  return `${currencySymbol}${formatted}`;
}

/**
 * Format amount using Intl.NumberFormat with currency code
 * @param amount - The amount to format
 * @param currencyCode - ISO currency code (e.g., 'USD', 'GEL', 'EUR')
 * @param locale - Locale string (default: 'en-US')
 */
export function formatCurrencyWithCode(
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
    return formatCurrencyAmount(amount, '$');
  }
}

