
export const CURRENCY_COUNTRY_MAP: Record<string, string> = {
  GEL: 'GE', 
  USD: 'US', 
  EUR: 'EU', 
  GBP: 'GB', 
  RUB: 'RU', 
  TRY: 'TR', 
  AMD: 'AM', 
  KZT: 'KZ', 
  UAH: 'UA', 
  JPY: 'JP', 
  CNY: 'CN', 
  CHF: 'CH', 
  CAD: 'CA', 
  AUD: 'AU', 
  PLN: 'PL', 
  SEK: 'SE', 
  NOK: 'NO', 
  DKK: 'DK', 
  INR: 'IN', 
  KRW: 'KR', 
};


export const CURRENCY_DISPLAY_NAMES: Record<string, string> = {
  USD: 'United States Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  CHF: 'Swiss Franc',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  CNY: 'Chinese Yuan',
  INR: 'Indian Rupee',
  KRW: 'South Korean Won',
  RUB: 'Russian Ruble',
  TRY: 'Turkish Lira',
  GEL: 'Georgian Lari',
  AMD: 'Armenian Dram',
  UAH: 'Ukrainian Hryvnia',
  KZT: 'Kazakhstani Tenge',
  PLN: 'Polish Zloty',
  SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone',
  DKK: 'Danish Krone',
};

export function getDisplayNameForCurrency(currencyAlias: string): string | undefined {
  const upper = currencyAlias.toUpperCase();
  return CURRENCY_DISPLAY_NAMES[upper];
}


export const CURRENCY_SEARCH_TERMS: Record<string, string[]> = {
  USD: ['United States', 'United States Dollar', 'USA', 'America'],
  EUR: ['European Union', 'Eurozone', 'Europe'],
  GBP: ['United Kingdom', 'British', 'UK', 'England'],
  JPY: ['Japan', 'Japanese'],
  CHF: ['Switzerland', 'Swiss'],
  CAD: ['Canada', 'Canadian'],
  AUD: ['Australia', 'Australian'],
  CNY: ['China', 'Chinese'],
  INR: ['India', 'Indian'],
  KRW: ['South Korea', 'Korean'],
  RUB: ['Russia', 'Russian'],
  TRY: ['Turkey', 'Turkish'],
  GEL: ['Georgia', 'Georgian'],
  AMD: ['Armenia', 'Armenian'],
  UAH: ['Ukraine', 'Ukrainian'],
  KZT: ['Kazakhstan', 'Kazakhstani'],
  PLN: ['Poland', 'Polish'],
  SEK: ['Sweden', 'Swedish'],
  NOK: ['Norway', 'Norwegian'],
  DKK: ['Denmark', 'Danish'],
};

export function getCountryCodeForCurrency(currencyAlias: string): string | undefined {
  const upper = currencyAlias.toUpperCase();
  return CURRENCY_COUNTRY_MAP[upper];
}

export function getSearchTermsForCurrency(currencyAlias: string): string[] {
  const upper = currencyAlias.toUpperCase();
  return CURRENCY_SEARCH_TERMS[upper] ?? [];
}

export type CurrencyOption = {
  id: number;
  name: string;
  symbol: string;
  alias: string;
};

export type CurrencyTypeaheadOption = {
  value: string;
  label: string;
  symbol?: string;
  countryCode?: string;
  searchTerms?: string[];
};


export function buildCurrencyTypeaheadOptions(
  currencyOptions: CurrencyOption[],
  valueFormat: 'id' | 'display' = 'id'
): CurrencyTypeaheadOption[] {
  return currencyOptions.map((c) => ({
    value: valueFormat === 'id' ? c.id.toString() : `${c.symbol} ${c.alias}`,
    label: `${getDisplayNameForCurrency(c.alias) ?? c.name} (${c.alias})`,
    symbol: c.symbol,
    countryCode: getCountryCodeForCurrency(c.alias),
    searchTerms: [c.name, c.alias, ...getSearchTermsForCurrency(c.alias)],
  }));
}
