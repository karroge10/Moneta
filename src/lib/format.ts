/**
 * Single source for number, money, percent, quantity and date formatting.
 *
 * Every helper takes an optional `locale`. The default is DEFAULT_LOCALE ('en-US') on purpose: the
 * server render and the first client render must produce the same string, otherwise React reports a
 * hydration mismatch. Pass the user's locale only from client-only code (effects, event handlers,
 * components rendered after mount).
 *
 * Render figures with the `tabular-nums` class so digits keep a fixed width.
 */

const DEFAULT_LOCALE = 'en-US';

/** Sign handling shared by money and percent helpers. 'always' renders +0 for zero. */
export type SignMode = 'auto' | 'always' | 'exceptZero' | 'never';

export interface NumberFormatOptions {
  locale?: string;
  minDecimals?: number;
  maxDecimals?: number;
  /** Short notation like 1.2M. */
  compact?: boolean;
  sign?: SignMode;
}

export interface MoneyFormatOptions {
  locale?: string;
  /** Fixed number of decimals. Defaults to 2. Ignored when `compact` is set. */
  decimals?: number;
  compact?: boolean;
  sign?: SignMode;
}

export interface PercentFormatOptions {
  locale?: string;
  /** Defaults to 2. */
  decimals?: number;
  /** Shorthand for sign: 'always' (prefix + on gains). */
  signed?: boolean;
}

export type DatePreset =
  /** Mar 5, 2026 */
  | 'medium'
  /** 03/05/2026 in en-US */
  | 'short'
  /** Thursday, March 5, 2026 */
  | 'long'
  /** Mar 2026 */
  | 'monthYear'
  /** Mar 5 */
  | 'dayMonth'
  /** Mar 5th 2026 (legacy display format) */
  | 'ordinal'
  /** 2026-03-05, value for <input type="date"> */
  | 'input';

/** Formats a plain number with grouping. Core helper the other number formatters build on. */
export function formatDecimal(value: number, options: NumberFormatOptions = {}): string {
  const formatter = getNumberFormatter(options.locale, {
    minimumFractionDigits: options.minDecimals,
    maximumFractionDigits: options.maxDecimals,
    notation: options.compact ? 'compact' : 'standard',
    compactDisplay: 'short',
    signDisplay: toIntlSign(options.sign ?? 'auto'),
  });
  return formatter.format(value);
}

/**
 * Formats an amount of money. `currency` is either an ISO 4217 code ('USD', 'EUR') which uses Intl
 * currency style, or a display symbol ('$', 'AZN', '₼') which is prefixed to the number.
 */
export function formatMoney(amount: number, currency: string, options: MoneyFormatOptions = {}): string {
  const decimals = options.compact ? undefined : (options.decimals ?? 2);
  const maxDecimals = options.compact ? 1 : decimals;

  if (isCurrencyCode(currency)) {
    const formatter = getNumberFormatter(options.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: maxDecimals,
      notation: options.compact ? 'compact' : 'standard',
      compactDisplay: 'short',
      signDisplay: toIntlSign(options.sign ?? 'auto'),
    });
    return formatter.format(amount);
  }

  const digits = formatDecimal(Math.abs(amount), {
    locale: options.locale,
    minDecimals: decimals,
    maxDecimals,
    compact: options.compact,
  });
  // A value that rounds to zero at the shown precision gets no sign, so it never reads "-$0.00".
  const smallestShown = 0.5 * 10 ** -(maxDecimals ?? 2);
  const signedAmount = Math.abs(amount) < smallestShown ? 0 : amount;
  const sign = signPrefix(signedAmount, options.sign ?? 'auto');
  return `${sign}${currency}${digits}`;
}

/** Formats a value that is already in percent units: 12.5 -> "12.50%". */
export function formatPercent(value: number, options: PercentFormatOptions = {}): string {
  const decimals = options.decimals ?? 2;
  const formatter = getNumberFormatter(options.locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: options.signed ? 'exceptZero' : 'negative',
  });
  return formatter.format(value / 100);
}

/**
 * Formats a holding quantity (shares, coins). Small values keep up to 8 decimals so 0.00012 BTC
 * stays readable; larger values cap at 4. Trailing zeros are dropped.
 */
export function formatQuantity(value: number, options: { locale?: string } = {}): string {
  const maxDecimals = Math.abs(value) < 10 ? 8 : 4;
  return formatDecimal(value, { locale: options.locale, minDecimals: 0, maxDecimals });
}

/**
 * Formats a date (Date, ISO string or timestamp). Invalid input returns ''.
 * Calendar dates are stored at UTC midnight, so formatting is done in UTC: formatting in the
 * browser's zone would show every date one day early for users west of UTC.
 */
export function formatDate(value: Date | string | number, preset: DatePreset = 'medium', locale?: string): string {
  const date = parseDate(value);
  if (!date) return '';

  if (preset === 'input') return toInputDate(date);
  if (preset === 'ordinal') return toOrdinalDate(date);

  const formatter = getDateFormatter(locale, DATE_PRESETS[preset]);
  return formatter.format(date);
}

/** Parses a Date, ISO string, timestamp or legacy "Mar 5th 2026" string. Returns null when invalid. */
export function parseDate(value: Date | string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const direct = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  if (typeof value !== 'string') return null;

  const withoutOrdinal = value.replace(/(\d+)(st|nd|rd|th)/, '$1');
  const parsed = new Date(withoutOrdinal);
  if (Number.isNaN(parsed.getTime())) return null;
  // "Mar 5 2026" parses as local midnight; pin it to the same calendar day at UTC midnight.
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

const DATE_PRESETS: Record<Exclude<DatePreset, 'input' | 'ordinal'>, Intl.DateTimeFormatOptions> = {
  medium: { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
  short: { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'UTC' },
  long: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' },
  monthYear: { month: 'short', year: 'numeric', timeZone: 'UTC' },
  dayMonth: { month: 'short', day: 'numeric', timeZone: 'UTC' },
};

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function getNumberFormatter(locale: string | undefined, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const resolvedLocale = locale ?? DEFAULT_LOCALE;
  const key = `${resolvedLocale}|${JSON.stringify(options)}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(resolvedLocale, options);
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

function getDateFormatter(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const resolvedLocale = locale ?? DEFAULT_LOCALE;
  const key = `${resolvedLocale}|${JSON.stringify(options)}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(resolvedLocale, options);
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

function isCurrencyCode(value: string): boolean {
  if (!/^[A-Z]{3}$/.test(value)) return false;
  try {
    new Intl.NumberFormat(DEFAULT_LOCALE, { style: 'currency', currency: value });
    return true;
  } catch {
    return false;
  }
}

function signPrefix(amount: number, mode: SignMode): string {
  if (mode === 'never') return '';
  if (amount < 0) return '-';
  if (mode === 'always') return '+';
  if (mode === 'exceptZero' && amount > 0) return '+';
  return '';
}

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toOrdinalDate(date: Date): string {
  const day = date.getUTCDate();
  const month = date.toLocaleString(DEFAULT_LOCALE, { month: 'short', timeZone: 'UTC' });
  return `${month} ${day}${ordinalSuffix(day)} ${date.getUTCFullYear()}`;
}

function ordinalSuffix(day: number): string {
  const lastTwo = day % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return 'th';
  if (day % 10 === 1) return 'st';
  if (day % 10 === 2) return 'nd';
  if (day % 10 === 3) return 'rd';
  return 'th';
}

/** Intl sign modes that never put a sign on a value that rounds to zero ("-0.00", "+0.00"). */
function toIntlSign(mode: SignMode): Intl.NumberFormatOptions['signDisplay'] {
  if (mode === 'auto') return 'negative';
  if (mode === 'always') return 'exceptZero';
  return mode;
}
