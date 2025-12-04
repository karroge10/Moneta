/**
 * Utilities for cleaning and formatting transaction names
 */

/**
 * Cleans a transaction name by removing:
 * 1. Georgian prefix: "საბარათე ოპერაცია გადახდა - " (Card operation payment -)
 * 2. Amount/currency/date suffix: " 1.00 GEL 11.11.2025"
 * 
 * Returns the cleaned merchant name (e.g., "minibus_tbilisi")
 */
export function cleanTransactionName(description: string): string {
  if (!description) return '';
  
  let cleaned = description.trim();
  
  // Remove Georgian prefix: "საბარათე ოპერაცია გადახდა - "
  // This pattern appears at the start of many Georgian bank transactions
  cleaned = cleaned.replace(/^საბარათე\s+ოპერაცია\s+გადახდა\s*-\s*/i, '');
  
  // Also handle English variants if they exist
  cleaned = cleaned.replace(/^card\s+operation\s+payment\s*-\s*/i, '');
  cleaned = cleaned.replace(/^card\s+payment\s*-\s*/i, '');
  cleaned = cleaned.replace(/^payment\s*-\s*/i, '');
  
  // Handle case where prefix might have different spacing or formatting
  cleaned = cleaned.replace(/^საბარათე\s*ოპერაცია\s*გადახდა\s*[-–—]\s*/i, '');
  
  // Remove amount/currency/date suffix patterns:
  // " 1.00 GEL 11.11.2025"
  // " 1.00 GEL"
  // " 1.00"
  // " GEL 1.00 11.11.2025"
  // " 11.11.2025"
  cleaned = cleaned.replace(/\s+\d+\.\d{2}\s+(GEL|USD|EUR|GBP)\s+\d{2}\.\d{2}\.\d{4}$/i, ''); // Amount currency date
  cleaned = cleaned.replace(/\s+\d+\.\d{2}\s+(GEL|USD|EUR|GBP)$/i, ''); // Amount currency
  cleaned = cleaned.replace(/\s+\d{2}\.\d{2}\.\d{4}$/i, ''); // Date only
  cleaned = cleaned.replace(/\s+\d+\.\d{2}$/i, ''); // Amount only (decimal)
  cleaned = cleaned.replace(/\s+\d+$/i, ''); // Amount only (integer)
  
  // Clean up any remaining trailing dashes or spaces
  cleaned = cleaned.replace(/\s*-\s*$/, '').trim();
  
  return cleaned;
}

/**
 * Simple translation map for common Georgian transaction terms
 * For more complex translations, consider using a translation API
 */
const GEORGIAN_TO_ENGLISH: Record<string, string> = {
  'საბარათე ოპერაცია გადახდა': 'Card operation payment',
  'გადახდა': 'Payment',
  'ოპერაცია': 'Operation',
  'საბარათე': 'Card',
  'გადარიცხვა': 'Transfer',
  'ჩარიცხვა': 'Deposit',
  'სხვა': 'Other',
  'სხვადასხვა': 'Various',
  'ბანკიდან': 'From bank',
  'მობილური': 'Mobile',
  'სელფი': 'Self',
};

/**
 * Translates Georgian text to English using a simple mapping
 * For production, consider using Google Translate API or similar service
 */
export function translateToEnglish(text: string): string {
  if (!text) return text;
  
  // Check if text contains Georgian characters
  const hasGeorgian = /[\u10A0-\u10FF]/.test(text);
  if (!hasGeorgian) return text;
  
  // Try direct mapping first
  if (GEORGIAN_TO_ENGLISH[text]) {
    return GEORGIAN_TO_ENGLISH[text];
  }
  
  // Replace known phrases first (longer phrases first to avoid partial matches)
  let translated = text;
  const sortedEntries = Object.entries(GEORGIAN_TO_ENGLISH).sort((a, b) => b[0].length - a[0].length);
  for (const [georgian, english] of sortedEntries) {
    translated = translated.replace(new RegExp(georgian.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), english);
  }
  
  // Also try word-by-word translation for remaining Georgian words
  // Split by common delimiters but preserve them
  const words = translated.split(/(\s+|[-\u2013\u2014\u2015])/);
  translated = words.map(word => {
    // If word contains Georgian characters and wasn't already translated
    if (/[\u10A0-\u10FF]/.test(word)) {
      // Try to find a translation for this word
      const trimmedWord = word.trim();
      if (GEORGIAN_TO_ENGLISH[trimmedWord]) {
        return word.replace(trimmedWord, GEORGIAN_TO_ENGLISH[trimmedWord]);
      }
    }
    return word;
  }).join('');
  
  // If still contains Georgian characters and we have a translation API, use it
  // For now, return as-is if no mapping found
  // TODO: Integrate with translation API for better coverage
  
  return translated;
}

/**
 * Formats a transaction name for display:
 * - Cleans the name (removes prefix and suffix)
 * - Optionally translates to English if user language is English
 * 
 * @param description - Full transaction description from database
 * @param userLanguageAlias - User's language alias (e.g., 'en', 'ka')
 * @param showFull - If true, returns full description (for transaction modal)
 */
export function formatTransactionName(
  description: string,
  userLanguageAlias?: string | null,
  showFull: boolean = false
): string {
  if (!description) return '';
  
  // If showing full name (e.g., in transaction modal), return as-is
  if (showFull) {
    // Still translate if user has English selected
    if (userLanguageAlias === 'en' || userLanguageAlias === 'english') {
      return translateToEnglish(description);
    }
    return description;
  }
  
  // Clean the name (remove prefix and suffix)
  let cleaned = cleanTransactionName(description);
  
  // Translate if user has English selected
  if (userLanguageAlias === 'en' || userLanguageAlias === 'english') {
    cleaned = translateToEnglish(cleaned);
  }
  
  return cleaned;
}

