
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
