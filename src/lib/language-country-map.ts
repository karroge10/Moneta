
export const LANGUAGE_COUNTRY_MAP: Record<string, string> = {
  en: 'US', 
  ka: 'GE', 
  ru: 'RU', 
};

export function getCountryCodeForLanguage(languageAlias: string): string | undefined {
  const lower = languageAlias.toLowerCase();
  return LANGUAGE_COUNTRY_MAP[lower];
}
