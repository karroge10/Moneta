


export function normalizeMerchantName(name: string): string {
  if (!name) return '';
  
  let normalized = name.toLowerCase().trim();
  
  
  normalized = normalized.replace(/\bh\s*&\s*m\b/gi, 'hm');
  normalized = normalized.replace(/\bhennes\s+and\s+mauritz\b/gi, 'hm');
  
  
  normalized = normalized.replace(/\bzoommer\b/gi, 'zoomer');
  normalized = normalized.replace(/\bcashless conversion\b/gi, 'currency exchange');
  normalized = normalized.replace(/\bexchange amount\b/gi, 'currency exchange');
  normalized = normalized.replace(/\bpersonal transfer\b/gi, 'personal transfer');
  normalized = normalized.replace(/\blari transfer fee\b/gi, 'transfer fee');

  
  normalized = normalized.replace(/\b(llc|inc|corp|corporation|ltd|limited|co|company|textile)\b/g, '');
  
  
  normalized = normalized.replace(/\./g, ' ');
  
  
  normalized = normalized.replace(/_/g, ' ');
  
  
  normalized = normalized.replace(/[^\w\s]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}



export function detectSpecialTransactionType(description: string): string | null {
  if (!description) return null;
  
  const desc = description.toLowerCase();
  
  
  
  
  if (desc.includes('roundup') ||
      desc.includes('round up') ||
      desc.includes('electronic roundup') ||
      (desc.includes('adding money') && desc.includes('account')) ||
      (desc.includes('account') && desc.includes('balance') && (desc.includes('add') || desc.includes('round'))) ||
      (desc.includes('electronic') && desc.includes('service') && (desc.includes('account') || desc.includes('balance')))) {
    return null; 
  }
  
  
  
  
  
  if (desc.includes('currency exchange') ||
      desc.includes('currency conversion') ||
      desc.includes('cashless conversion') ||
      (desc.includes('exchange amount') || (desc.includes('exchange') && desc.includes('amount'))) ||
      (desc.includes('conversion') && !desc.includes('payment')) ||
      (desc.includes('convert') && (desc.includes('currency') || desc.includes('cashless'))) ||
      (desc.includes('exchange') && desc.includes('currency'))) {
    return null; 
  }
  
  
  if (desc.includes('private transfer') ||
      desc.includes('personal transfer') ||
      desc.includes('money transfer') ||
      desc.includes('transfer from') ||
      desc.includes('transfer to') ||
      (desc.includes('transfer') && desc.includes('private')) ||
      (desc.includes('transfer') && desc.includes('personal')) ||
      (desc.includes('transfer') && desc.includes('bank'))) {
    return null; 
  }
  
  
  if (desc.includes('card deposit') ||
      desc.includes('deposit to card') ||
      desc.includes('top up card') ||
      desc.includes('card top up') ||
      (desc.includes('deposit') && desc.includes('card'))) {
    return null; 
  }
  
  
  if (desc.includes('transfer fee') || desc.includes('ქარიქას გადასახადი')) {
    return null;
  }

  
  if ((desc.includes('commission') && !desc.includes('payment') && !desc.includes('transfer')) ||
      (desc.includes('service fee') && !desc.includes('payment') && !desc.includes('transfer')) ||
      (desc.includes('transaction fee') && !desc.includes('payment') && !desc.includes('transfer'))) {
    return 'other'; 
  }
  
  
  
  
  
  
  
  
  
  
  if (desc.includes('atm') ||
      desc.includes('cash withdrawal') ||
      desc.includes('money withdrawal') ||
      desc.includes('withdrawal of money') ||
      (desc.includes('withdrawal') && (desc.includes('account') || desc.includes('from account'))) ||
      (desc.includes('withdraw') && desc.includes('account')) ||
      (desc.includes('take out') && (desc.includes('account') || desc.includes('money'))) ||
      (desc.includes('takeout') && (desc.includes('account') || desc.includes('money')))) {
    return null; 
  }
  
  return null; 
}

export function extractMerchantFromDescription(description: string): string {
  if (!description) return '';
  
  let cleaned = description;
  
  
  
  
  
  
  
  
  
  
  
  
  const utilityPatternMatch = cleaned.match(/^(?:payment\s+(?:for\s+)?(?:electricity|electric|gas|heating|water|internet|phone|mobile|cleaning|elevator|utility|utilities|phone\s*,\s*internet)|cleaning|various|phone\s*,\s*internet)\s*-\s*([^-]+?)(?:\s*-\s*[^-]+)*\s*-\s*\d+\s*$/i);
  if (utilityPatternMatch && utilityPatternMatch[1]) {
    
    cleaned = utilityPatternMatch[1].trim();
    
    cleaned = cleaned
      .replace(/\s*\([^)]*\)\s*/g, '') 
      .replace(/\b(llc|inc|corp|ltd|limited|shps|შპს)\b/gi, '') 
      .trim();
  } else {
    
    const simpleUtilityMatch = cleaned.match(/^(?:payment\s+(?:for\s+)?(?:electricity|electric|gas|heating|water|internet|phone|mobile|cleaning|elevator|utility|utilities)|cleaning|various|phone\s*,\s*internet)\s*-\s*([^-]+?)(?:\s*-\s*\d+)?\s*$/i);
    if (simpleUtilityMatch && simpleUtilityMatch[1]) {
      cleaned = simpleUtilityMatch[1].trim();
      
      cleaned = cleaned.replace(/\b(llc|inc|corp|ltd|limited|shps|შპს)\b/gi, '').trim();
    } else {
      
      cleaned = cleaned
        .replace(/^card\s+operation\s+payment\s*-\s*/i, '') 
        .replace(/^card\s+operation\s+(?:cash\s+)?withdrawal\s*-\s*/i, '') 
        .replace(/^card\s+payment\s*-\s*/i, '') 
        .replace(/^payment\s+(?:for\s+)?(?:electricity|electric|gas|heating|water|internet|phone|mobile|cleaning|elevator|utility|utilities)\s*-\s*/i, '') 
        .replace(/^cleaning\s*-\s*/i, '') 
        .replace(/^various\s*-\s*/i, '') 
        .replace(/^payment\s*-\s*/i, '') 
        .replace(/^transaction\s*-\s*/i, '') 
        .replace(/^payments?\s+/i, '') 
        .trim();
    }
  }
  
  
  
  
  
  const paymentProcessorMatch = cleaned.match(/(?:vip\s*pay|tpay|pay)\w*\s*\*\s*([^*]+)/i);
  if (paymentProcessorMatch && paymentProcessorMatch[1]) {
    
    let merchantPart = paymentProcessorMatch[1];
    
    merchantPart = merchantPart.replace(/(?:vip\s*pay|tpay|pay)/gi, '');
    
    merchantPart = merchantPart.replace(/\b(llc|inc|corp|ltd|limited)\b/gi, '');
    
    merchantPart = merchantPart.trim();
    
    if (merchantPart.length > 2) {
      cleaned = merchantPart;
    }
  } else {
    
    
    const merchantBeforeAsterisk = cleaned.match(/^([A-Z][A-Z0-9\s]+?)\s*\*\s*/i);
    if (merchantBeforeAsterisk && merchantBeforeAsterisk[1]) {
      const merchantName = merchantBeforeAsterisk[1].trim();
      
      if (merchantName.length >= 3 && !/^\d+$/.test(merchantName)) {
        cleaned = merchantName;
      }
    }
  }
  
  
  cleaned = cleaned
    .replace(/^(?:vip\s*pay|tpay)\w*\s*\*/i, '')
    .replace(/\*(?:vip\s*pay|tpay)\w*/i, '')
    .replace(/^pay\w*\s*\*/i, '')
    .replace(/\*pay\w*/i, '');
  
  
  cleaned = cleaned
    .replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, '') 
    .replace(/\d{2}\.\d{2}\.\d{4}/g, '') 
    .replace(/\d{2}\/\d{2}\/\d{4}/g, '') 
    .replace(/^\d+\s*-\s*/g, '') 
    .replace(/\s+\d+\.\d{2}\s*(GEL|USD|EUR|GBP)?\s*$/i, '') 
    .replace(/\s+\d+\.\d{2}\s*$/g, '') 
    .replace(/\s+(GEL|USD|EUR|GBP)\s+\d+\.\d{2}\.\d{4}/gi, '') 
    .replace(/\s+(GEL|USD|EUR|GBP)\s*$/gi, '') 
    .trim();
  
  
  
  const words = cleaned
    .split(/\s+/)
    .filter(word => {
      
      if (word.length < 2) return false;
      if (/^\d+$/.test(word)) return false;
      
      return true;
    })
    .slice(0, 5); 
  
  let result = words.join(' ').trim();
  
  
  result = result.replace(/\./g, ' ');
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}


export function fuzzyMatch(str1: string, str2: string): number {
  const s1 = normalizeMerchantName(str1);
  const s2 = normalizeMerchantName(str2);
  
  if (s1 === s2) return 1.0;
  
  
  if (s1.includes(s2) || s2.includes(s1)) {
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 0;
    return 0.75 + (shorter.length / longer.length) * 0.2; 
  }
  
  
  const words1 = s1.split(/\s+/).filter(w => w.length > 1);
  const words2 = s2.split(/\s+/).filter(w => w.length > 1);
  
  if (words1.length > 0 && words2.length > 0) {
    const commonWords = words1.filter(w => words2.includes(w));
    if (commonWords.length > 0) {
      
      const shorterWords = words1.length < words2.length ? words1 : words2;
      const longerWords = words1.length >= words2.length ? words1 : words2;
      if (commonWords.length === shorterWords.length && shorterWords.length > 0) {
        return 0.8 + (commonWords.length / Math.max(longerWords.length, 1)) * 0.15;
      }
      
      const wordSimilarity = commonWords.length / Math.max(words1.length, words2.length);
      return 0.5 + wordSimilarity * 0.25;
    }
  }
  
  
  
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  const charSimilarity = intersection.size / union.size;
  
  
  
  if (s1.length < 6 || s2.length < 6) {
    return charSimilarity >= 0.75 ? charSimilarity : 0;
  }
  
  return charSimilarity >= 0.75 ? charSimilarity : 0;
}


function extractSignificantWords(text: string, filterLocationWords: boolean = true): string[] {
  const normalized = normalizeMerchantName(text);
  const words = normalized.split(/\s+/);
  
  
  const commonWords = new Set([
    'card', 'payment', 'operation', 'transaction', 'გადახდა', 'ოპერაცია', 'საბარათე',
    'gel', 'usd', 'eur', 'gbp', 'currency', 'amount', 'total', 'fee', 'charge',
    'tpay', 'pay', 'vip', 'llc', 'inc', 'ltd', 'limited', 'corp', 'corporation',
    'service', 'services', 'group', 'delivery', 'transfer', 'transfers', 'private',
    'გადარიცხვა', 'ჩარიცხვა', 'სხვა', 'სხვადასხვა', 'ბანკიდან',
  ]);
  
  
  const locationWords = new Set([
    'tbilisi', 'georgia', 'georgian',
  ]);
  
  return words.filter(word => {
    
    if (word.length < 3) return false;
    
    if (/^\d+$/.test(word)) return false;
    
    if (commonWords.has(word)) return false;
    
    if (filterLocationWords && locationWords.has(word)) return false;
    return true;
  });
}


export function findMerchantByBaseWords(description: string, merchantPatterns: string[]): string | null {
  if (!description || merchantPatterns.length === 0) return null;
  
  
  const descWords = extractSignificantWords(description, true);
  if (descWords.length === 0) return null;
  
  
  const normalizedDesc = normalizeMerchantName(description);
  
  
  const sortedPatterns = [...merchantPatterns].sort((a, b) => {
    const aWords = extractSignificantWords(a, false).length;
    const bWords = extractSignificantWords(b, false).length;
    if (aWords !== bWords) return bWords - aWords; 
    return b.length - a.length; 
  });
  
  
  for (const pattern of sortedPatterns) {
    const normalizedPattern = normalizeMerchantName(pattern);
    if (!normalizedPattern || normalizedPattern.length < 2) continue;
    
    
    const patternWords = extractSignificantWords(pattern, false);
    if (patternWords.length === 0) continue;
    
    
    if (normalizedDesc.includes(normalizedPattern)) {
      return pattern;
    }
    
    
    
    for (const patternWord of patternWords) {
      
      
      if (patternWord.length >= 4) {
        
        if (descWords.includes(patternWord)) {
          return pattern;
        }
        
        
        
        if (descWords.some(descWord => {
          if (descWord.length < 4 || patternWord.length < 4) return false;
          return descWord.includes(patternWord) || patternWord.includes(descWord);
        })) {
          return pattern;
        }
      }
    }
    
    
    
    if (patternWords.length > 1) {
      
      const nonLocationPatternWords = patternWords.filter(w => !['tbilisi', 'georgia', 'georgian'].includes(w));
      if (nonLocationPatternWords.length > 0 && nonLocationPatternWords.every(word => normalizedDesc.includes(word))) {
        return pattern;
      }
    }
    
    
    if (normalizedPattern.includes(normalizedDesc)) {
      return pattern;
    }
  }
  
  return null;
}


export function findMerchantInDescription(description: string, merchantPatterns: string[]): string | null {
  
  return findMerchantByBaseWords(description, merchantPatterns);
}

