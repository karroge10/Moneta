
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


export function formatSmartNumber(value: number): string {
  const absValue = Math.abs(value);
  const maxDecimals = absValue < 10 ? 8 : 2;
  
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  });
}


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


export function getExpenseTrendColor(value: number): string {
  return value <= 0 ? 'var(--accent-green)' : 'var(--error)';
}

export function formatPercentage(value: number, includeSign = false): string {
  const sign = includeSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}


export function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  
  
  if (absValue < 1000000) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: absValue < 1000 ? 2 : 0,
    });
  }
  
  
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}

