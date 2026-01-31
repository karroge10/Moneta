/**
 * Maps ISO 4217 currency codes (alias) to ISO 3166-1 alpha-2 country codes.
 * Used for displaying flags in currency pickers via flagsapi.com.
 * EUR maps to EU (European Union). Multi-country currencies use a representative country.
 */
export const CURRENCY_COUNTRY_MAP: Record<string, string> = {
  GEL: 'GE', // Georgian Lari
  USD: 'US', // US Dollar
  EUR: 'EU', // Euro (European Union)
  GBP: 'GB', // British Pound
  RUB: 'RU', // Russian Ruble
  TRY: 'TR', // Turkish Lira
  AMD: 'AM', // Armenian Dram
  KZT: 'KZ', // Kazakhstani Tenge
  UAH: 'UA', // Ukrainian Hryvnia
  JPY: 'JP', // Japanese Yen
  CNY: 'CN', // Chinese Yuan
  CHF: 'CH', // Swiss Franc
  CAD: 'CA', // Canadian Dollar
  AUD: 'AU', // Australian Dollar
  PLN: 'PL', // Polish Zloty
  SEK: 'SE', // Swedish Krona
  NOK: 'NO', // Norwegian Krone
  DKK: 'DK', // Danish Krone
  INR: 'IN', // Indian Rupee
  KRW: 'KR', // South Korean Won
};

/** Full display names for currency options (e.g. USD -> "United States Dollar"). */
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

/** Extra search terms for currency typeahead (e.g. "United States" -> USD). */
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

/** Builds unified TypeaheadOption format for currency selectors: [flag] [symbol] Display Name (ALIAS) */
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
