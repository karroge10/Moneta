
function cleanTransactionName(description: string): string {
  if (!description) return '';
  
  let cleaned = description.trim();
  
  
  
  cleaned = cleaned.replace(/^საბარათე\s+ოპერაცია\s+გადახდა\s*-\s*/i, '');
  
  
  cleaned = cleaned.replace(/^card\s+operation\s+payment\s*-\s*/i, '');
  cleaned = cleaned.replace(/^card\s+payment\s*-\s*/i, '');
  cleaned = cleaned.replace(/^payment\s*-\s*/i, '');
  
  
  cleaned = cleaned.replace(/^საბარათე\s*ოპერაცია\s*გადახდა\s*[-–—]\s*/i, '');
  
  
  
  
  
  
  
  cleaned = cleaned.replace(/\s+\d+\.\d{2}\s+(GEL|USD|EUR|GBP)\s+\d{2}\.\d{2}\.\d{4}$/i, ''); 
  cleaned = cleaned.replace(/\s+\d+\.\d{2}\s+(GEL|USD|EUR|GBP)$/i, ''); 
  cleaned = cleaned.replace(/\s+\d{2}\.\d{2}\.\d{4}$/i, ''); 
  cleaned = cleaned.replace(/\s+\d+\.\d{2}$/i, ''); 
  cleaned = cleaned.replace(/\s+\d+$/i, ''); 
  
  
  cleaned = cleaned.replace(/\s*-\s*$/, '').trim();
  
  return cleaned;
}


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


function translateToEnglish(text: string): string {
  if (!text) return text;
  
  
  const hasGeorgian = /[\u10A0-\u10FF]/.test(text);
  if (!hasGeorgian) return text;
  
  
  if (GEORGIAN_TO_ENGLISH[text]) {
    return GEORGIAN_TO_ENGLISH[text];
  }
  
  
  let translated = text;
  const sortedEntries = Object.entries(GEORGIAN_TO_ENGLISH).sort((a, b) => b[0].length - a[0].length);
  for (const [georgian, english] of sortedEntries) {
    translated = translated.replace(new RegExp(georgian.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), english);
  }
  
  
  
  const words = translated.split(/(\s+|[-\u2013\u2014\u2015])/);
  translated = words.map(word => {
    
    if (/[\u10A0-\u10FF]/.test(word)) {
      
      const trimmedWord = word.trim();
      if (GEORGIAN_TO_ENGLISH[trimmedWord]) {
        return word.replace(trimmedWord, GEORGIAN_TO_ENGLISH[trimmedWord]);
      }
    }
    return word;
  }).join('');
  
  return translated;
}


export function formatTransactionName(
  description: string,
  userLanguageAlias?: string | null,
  showFull: boolean = false
): string {
  if (!description) return '';
  
  
  if (showFull) {
    
    if (userLanguageAlias === 'en' || userLanguageAlias === 'english') {
      return translateToEnglish(description);
    }
    return description;
  }
  
  
  let cleaned = cleanTransactionName(description);
  
  
  if (userLanguageAlias === 'en' || userLanguageAlias === 'english') {
    cleaned = translateToEnglish(cleaned);
  }
  
  return cleaned;
}

const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DISPLAY_DATE_PATTERN = /^([A-Za-z]{3})[A-Za-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/;

/** "Jan 5th 2026" for the UTC day of `date`. */
export function formatDisplayDate(date: Date): string {
  const day = date.getUTCDate();
  const month = MONTH_ABBREVIATIONS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${month} ${day}${ordinalSuffix(day)} ${year}`;
}

/**
 * Parses either a display date ("Jan 5th 2026") or any string Date understands (ISO "2026-01-05").
 * Display dates become UTC midnight of that day. Returns null when the input is not a date.
 */
export function parseDisplayDate(value: string): Date | null {
  const match = DISPLAY_DATE_PATTERN.exec(value.trim());
  if (match) {
    const month = MONTH_ABBREVIATIONS.indexOf(match[1]);
    if (month < 0) return null;
    const day = Number(match[2]);
    const year = Number(match[3]);
    return new Date(Date.UTC(year, month, day));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function ordinalSuffix(day: number): string {
  if (day === 1 || day === 21 || day === 31) return 'st';
  if (day === 2 || day === 22) return 'nd';
  if (day === 3 || day === 23) return 'rd';
  return 'th';
}
