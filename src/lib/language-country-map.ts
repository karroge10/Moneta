/**
 * Maps language alias/code to ISO 3166-1 alpha-2 country code for flags.
 * Used for displaying flags in language pickers via flagsapi.com.
 */
export const LANGUAGE_COUNTRY_MAP: Record<string, string> = {
  en: 'US', // English
  ka: 'GE', // Georgian
  ru: 'RU', // Russian
};

export function getCountryCodeForLanguage(languageAlias: string): string | undefined {
  const lower = languageAlias.toLowerCase();
  return LANGUAGE_COUNTRY_MAP[lower];
}
