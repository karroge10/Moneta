
export function getDefaultCurrency() {
  return {
    id: 0,
    name: 'US Dollar',
    symbol: '$',
    alias: 'USD',
  };
}


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
    
    return formatCurrencyAmount(amount, '$');
  }
}

