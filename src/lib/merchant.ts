/**
 * Merchant name normalization and matching utilities
 * Used for merchant-to-category mapping and fuzzy matching
 */

/**
 * Normalizes a merchant name for consistent matching
 * - Lowercases
 * - Handles special cases (H&M, etc.)
 * - Removes punctuation and extra spaces
 * - Removes common prefixes/suffixes (LLC, INC, etc.)
 */
export function normalizeMerchantName(name: string): string {
  if (!name) return '';
  
  let normalized = name.toLowerCase().trim();
  
  // Special handling for H&M - convert to "hm"
  normalized = normalized.replace(/\bh\s*&\s*m\b/gi, 'hm');
  normalized = normalized.replace(/\bhennes\s+and\s+mauritz\b/gi, 'hm');
  
  // Remove common business suffixes (including textile, limited, etc.)
  normalized = normalized.replace(/\b(llc|inc|corp|corporation|ltd|limited|co|company|textile)\b/g, '');
  
  // Remove dots and replace with spaces (e.g., "YANDEX.GO" -> "YANDEX GO")
  normalized = normalized.replace(/\./g, ' ');
  
  // Replace underscores with spaces (e.g., "bus_tbilisi" -> "bus tbilisi")
  normalized = normalized.replace(/_/g, ' ');
  
  // Remove punctuation and normalize spaces (but preserve word boundaries)
  normalized = normalized.replace(/[^\w\s]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Extracts merchant name from transaction description
 * Tries multiple strategies to find merchant name:
 * 1. Remove Georgian/transaction prefixes
 * 2. Extract from payment processor patterns (Tpay*MERCHANT)
 * 3. Extract before amount/date info
 */
/**
 * Check if transaction should be excluded from merchant matching or has special type
 * Returns:
 * - 'EXCLUDE' for transactions that should be completely excluded (roundup, currency exchange) - don't save at all
 * - category name string for special types that should be categorized (e.g., 'other' for commissions, ATM withdrawals)
 * - null if no special handling needed (proceed with normal merchant matching)
 */
export function detectSpecialTransactionType(description: string): string | null {
  if (!description) return null;
  
  const desc = description.toLowerCase();
  
  // Roundup feature - electronic roundup service
  // Patterns: "roundup", "round up", "electronic roundup", "adding money to account", "account balance"
  if (desc.includes('roundup') ||
      desc.includes('round up') ||
      desc.includes('electronic roundup') ||
      (desc.includes('adding money') && desc.includes('account')) ||
      (desc.includes('account') && desc.includes('balance') && (desc.includes('add') || desc.includes('round'))) ||
      (desc.includes('electronic') && desc.includes('service') && (desc.includes('account') || desc.includes('balance')))) {
    return 'EXCLUDE'; // Exclude from categorization - it's just money movement
  }
  
  // Currency exchange - money staying on account but changing currency
  // Patterns: "currency exchange", "conversion", "convert", "cashless conversion"
  // Note: All descriptions should already be translated to English before this function is called
  if (desc.includes('currency exchange') ||
      desc.includes('currency conversion') ||
      desc.includes('cashless conversion') ||
      (desc.includes('conversion') && !desc.includes('payment')) ||
      (desc.includes('convert') && (desc.includes('currency') || desc.includes('cashless'))) ||
      (desc.includes('exchange') && desc.includes('currency'))) {
    return 'EXCLUDE'; // Exclude from categorization
  }
  
  // Private transfers / Money transfers - exclude from categorization
  if (desc.includes('private transfer') ||
      desc.includes('money transfer') ||
      desc.includes('transfer from') ||
      desc.includes('transfer to') ||
      (desc.includes('transfer') && desc.includes('private')) ||
      (desc.includes('transfer') && desc.includes('bank'))) {
    return 'EXCLUDE'; // Exclude from categorization
  }
  
  // Card deposits - money being added to card (exclude from categorization)
  if (desc.includes('card deposit') ||
      desc.includes('deposit to card') ||
      desc.includes('top up card') ||
      desc.includes('card top up') ||
      (desc.includes('deposit') && desc.includes('card'))) {
    return 'EXCLUDE'; // Exclude from categorization - it's money movement, not spending
  }
  
  // Commissions/fees - map to "Other" category
  if ((desc.includes('commission') && !desc.includes('payment')) ||
      (desc.includes('service fee') && !desc.includes('payment')) ||
      (desc.includes('transaction fee') && !desc.includes('payment'))) {
    return 'other'; // Map commissions to "Other" category
  }
  
  // ATM withdrawals - map to "Other" category
  if (desc.includes('atm') ||
      ((desc.includes('cash withdrawal') || desc.includes('withdrawal')) && 
       (desc.includes('atm') || desc.includes('cash') || desc.includes('card operation')))) {
    return 'other'; // Map ATM withdrawals to "Other" category
  }
  
  return null; // No special handling, proceed with normal merchant matching
}

export function extractMerchantFromDescription(description: string): string {
  if (!description) return '';
  
  let cleaned = description;
  
  // Strategy 1: Remove common payment prefixes and transaction prefixes
  // Handle utility payment patterns: "Payment [service type] - [merchant name]"
  // Examples: "Payment electricity - Telmiko", "Payment cleaning - Tbilservice Group"
  const utilityPaymentMatch = cleaned.match(/^payment\s+(?:for\s+)?(?:electricity|electric|gas|heating|water|internet|phone|mobile|cleaning|elevator|utility|utilities)\s*-\s*(.+?)(?:\s*-\s*[^-]+)?$/i);
  if (utilityPaymentMatch && utilityPaymentMatch[1]) {
    // Extract merchant from utility payment format
    cleaned = utilityPaymentMatch[1].trim();
    // Remove account numbers and extra info
    cleaned = cleaned.replace(/\s*-\s*\d+\s*$/, '').trim();
  } else {
    // Handle generic payment patterns
    cleaned = cleaned
      .replace(/^card\s+operation\s+payment\s*-\s*/i, '') // "Card operation payment -"
      .replace(/^card\s+operation\s+(?:cash\s+)?withdrawal\s*-\s*/i, '') // "Card operation withdrawal -"
      .replace(/^card\s+payment\s*-\s*/i, '') // "Card payment -"
      .replace(/^payment\s+(?:for\s+)?(?:electricity|electric|gas|heating|water|internet|phone|mobile|cleaning|elevator|utility|utilities)\s*-\s*/i, '') // "Payment electricity -"
      .replace(/^payment\s*-\s*/i, '') // "Payment -"
      .replace(/^transaction\s*-\s*/i, '') // "Transaction -"
      .replace(/^payments?\s+/i, '') // "Payments" prefix
      .trim();
  }
  
  // Strategy 2: Extract merchant from payment processor patterns
  // Patterns: "TpayLLC*TPAYLLCWendysD", "Vip Pay*YANDEX.GO", "Tpay*Wendys", etc.
  // Look for patterns like "PaymentProcessor*MerchantName" or "PaymentProcessor MerchantName"
  const paymentProcessorMatch = cleaned.match(/(?:vip\s*pay|tpay|pay)\w*\s*\*\s*([^*]+)/i);
  if (paymentProcessorMatch && paymentProcessorMatch[1]) {
    // Extract merchant name from after the asterisk
    let merchantPart = paymentProcessorMatch[1];
    // Remove any remaining payment processor references (case insensitive)
    merchantPart = merchantPart.replace(/(?:vip\s*pay|tpay|pay)/gi, '');
    // Remove business suffixes that might be embedded (LLC, INC, etc.)
    merchantPart = merchantPart.replace(/\b(llc|inc|corp|ltd|limited)\b/gi, '');
    // Clean up the result
    merchantPart = merchantPart.trim();
    // If we have something meaningful left, use it
    if (merchantPart.length > 2) {
      cleaned = merchantPart;
    }
  }
  
  // Strategy 3: Remove payment processor prefixes/suffixes (fallback)
  cleaned = cleaned
    .replace(/^(?:vip\s*pay|tpay)\w*\s*\*/i, '')
    .replace(/\*(?:vip\s*pay|tpay)\w*/i, '')
    .replace(/^pay\w*\s*\*/i, '')
    .replace(/\*pay\w*/i, '');
  
  // Strategy 4: Remove common transaction patterns
  cleaned = cleaned
    .replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, '') // Card numbers
    .replace(/\d{2}\.\d{2}\.\d{4}/g, '') // Dates DD.MM.YYYY
    .replace(/\d{2}\/\d{2}\/\d{4}/g, '') // Dates DD/MM/YYYY
    .replace(/^\d+\s*-\s*/g, '') // Leading numbers with dash
    .replace(/\s+\d+\.\d{2}\s*(GEL|USD|EUR|GBP)?\s*$/i, '') // Trailing amounts with currency
    .replace(/\s+\d+\.\d{2}\s*$/g, '') // Trailing amounts
    .replace(/\s+(GEL|USD|EUR|GBP)\s+\d+\.\d{2}\.\d{4}/gi, '') // Currency amount date pattern
    .replace(/\s+(GEL|USD|EUR|GBP)\s*$/gi, '') // Trailing currency
    .trim();
  
  // Strategy 5: Take first meaningful words (skip single letters, numbers)
  // But be smarter - if we have a clear merchant name, use it
  const words = cleaned
    .split(/\s+/)
    .filter(word => {
      // Keep words that are at least 2 characters and not just numbers
      if (word.length < 2) return false;
      if (/^\d+$/.test(word)) return false;
      // Keep merchant names even if they have dots (like "YANDEX.GO")
      return true;
    })
    .slice(0, 5); // Take up to 5 words
  
  let result = words.join(' ').trim();
  
  // Clean up dots in merchant names (e.g., "YANDEX.GO" -> "YANDEX GO")
  result = result.replace(/\./g, ' ');
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Improved fuzzy matching
 * Returns similarity score 0-1 (1 = exact match)
 * Also checks for substring matches and word overlap
 */
export function fuzzyMatch(str1: string, str2: string): number {
  const s1 = normalizeMerchantName(str1);
  const s2 = normalizeMerchantName(str2);
  
  if (s1 === s2) return 1.0;
  
  // Check if one contains the other (after normalization)
  if (s1.includes(s2) || s2.includes(s1)) {
    // Calculate how much of the longer string is covered
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 0;
    return 0.75 + (shorter.length / longer.length) * 0.2; // 0.75-0.95 range
  }
  
  // Check word overlap (important for multi-word merchants like "h&m" -> "hennes and mauritz")
  const words1 = s1.split(/\s+/).filter(w => w.length > 1);
  const words2 = s2.split(/\s+/).filter(w => w.length > 1);
  
  if (words1.length > 0 && words2.length > 0) {
    const commonWords = words1.filter(w => words2.includes(w));
    if (commonWords.length > 0) {
      // If all words in shorter name are in longer name, high similarity
      const shorterWords = words1.length < words2.length ? words1 : words2;
      const longerWords = words1.length >= words2.length ? words1 : words2;
      if (commonWords.length === shorterWords.length && shorterWords.length > 0) {
        return 0.8 + (commonWords.length / Math.max(longerWords.length, 1)) * 0.15;
      }
      // Partial word match
      const wordSimilarity = commonWords.length / Math.max(words1.length, words2.length);
      return 0.5 + wordSimilarity * 0.25;
    }
  }
  
  // Character overlap similarity (fallback) - but be more strict for short strings
  // This prevents false matches like "guts and fame" matching "furniture" just because they share some letters
  const set1 = new Set(s1.split(''));
  const set2 = new Set(s2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  if (union.size === 0) return 0;
  const charSimilarity = intersection.size / union.size;
  
  // For short strings, require higher similarity to avoid false positives
  // If either string is short (< 6 chars), require at least 0.6 similarity
  if (s1.length < 6 || s2.length < 6) {
    return charSimilarity >= 0.6 ? charSimilarity : 0;
  }
  
  return charSimilarity;
}

/**
 * Extract significant words from a description (words that are likely merchant names)
 * Filters out common transaction words, dates, amounts, etc.
 * @param text - Text to extract words from
 * @param filterLocationWords - Whether to filter out location words (default: true for descriptions, false for patterns)
 */
function extractSignificantWords(text: string, filterLocationWords: boolean = true): string[] {
  const normalized = normalizeMerchantName(text);
  const words = normalized.split(/\s+/);
  
  // Filter out common transaction words and short words
  const commonWords = new Set([
    'card', 'payment', 'operation', 'transaction', 'გადახდა', 'ოპერაცია', 'საბარათე',
    'gel', 'usd', 'eur', 'gbp', 'currency', 'amount', 'total', 'fee', 'charge',
    'tpay', 'pay', 'vip', 'llc', 'inc', 'ltd', 'limited', 'corp', 'corporation',
    'service', 'services', 'group', 'delivery', 'transfer', 'transfers', 'private',
    'გადარიცხვა', 'ჩარიცხვა', 'სხვა', 'სხვადასხვა', 'ბანკიდან',
  ]);
  
  // Location words to filter (only when filtering location words)
  const locationWords = new Set([
    'tbilisi', 'georgia', 'georgian',
  ]);
  
  return words.filter(word => {
    // Must be at least 3 characters
    if (word.length < 3) return false;
    // Not a number
    if (/^\d+$/.test(word)) return false;
    // Not a common transaction word
    if (commonWords.has(word)) return false;
    // Filter location words if requested (for descriptions, not for patterns)
    if (filterLocationWords && locationWords.has(word)) return false;
    return true;
  });
}

/**
 * Find merchant by matching base words
 * Returns the merchant pattern if any significant word matches, null otherwise
 * This allows "yandex" to match "YANDEX.GO", "yandex taxi", etc.
 */
export function findMerchantByBaseWords(description: string, merchantPatterns: string[]): string | null {
  if (!description || merchantPatterns.length === 0) return null;
  
  // Extract significant words from description (filter location words)
  const descWords = extractSignificantWords(description, true);
  if (descWords.length === 0) return null;
  
  // Normalize description for full-text matching (fallback)
  const normalizedDesc = normalizeMerchantName(description);
  
  // Sort patterns by specificity (longer patterns first) to prefer more specific matches
  const sortedPatterns = [...merchantPatterns].sort((a, b) => {
    const aWords = extractSignificantWords(a, false).length;
    const bWords = extractSignificantWords(b, false).length;
    if (aWords !== bWords) return bWords - aWords; // Longer patterns first
    return b.length - a.length; // Longer strings first
  });
  
  // Try to match each merchant pattern (most specific first)
  for (const pattern of sortedPatterns) {
    const normalizedPattern = normalizeMerchantName(pattern);
    if (!normalizedPattern || normalizedPattern.length < 2) continue;
    
    // Extract base words from pattern (don't filter location words - they're part of the pattern)
    const patternWords = extractSignificantWords(pattern, false);
    if (patternWords.length === 0) continue;
    
    // Strategy 1: Check if pattern is contained in description (for multi-word patterns like "tbilisi metro")
    if (normalizedDesc.includes(normalizedPattern)) {
      return pattern;
    }
    
    // Strategy 2: Check if any description word matches any pattern word exactly
    // This allows "yandex" to match "YANDEX.GO", "bus" to match "bus_tbilisi", etc.
    for (const patternWord of patternWords) {
      // Require at least 4 characters for word matching to avoid false positives
      // (3 chars is too short - "rs", "fee", etc. cause issues)
      if (patternWord.length >= 4) {
        // Exact word match (case-insensitive after normalization)
        if (descWords.includes(patternWord)) {
          return pattern;
        }
        // Substring match - pattern word is in description word or vice versa
        // This handles cases like "yandex" matching "yandexgo" or "yandex.go"
        // But only if the match is substantial (at least 4 chars)
        if (descWords.some(descWord => {
          if (descWord.length < 4 || patternWord.length < 4) return false;
          return descWord.includes(patternWord) || patternWord.includes(descWord);
        })) {
          return pattern;
        }
      }
    }
    
    // Strategy 3: Check if all pattern words appear in description (for multi-word patterns)
    // This allows "tbilisi metro" to match even if "tbilisi" is filtered from description
    if (patternWords.length > 1) {
      // Check if all non-location words from pattern appear in description
      const nonLocationPatternWords = patternWords.filter(w => !['tbilisi', 'georgia', 'georgian'].includes(w));
      if (nonLocationPatternWords.length > 0 && nonLocationPatternWords.every(word => normalizedDesc.includes(word))) {
        return pattern;
      }
    }
    
    // Strategy 4: Check if description is contained in pattern (for base names matching longer descriptions)
    if (normalizedPattern.includes(normalizedDesc)) {
      return pattern;
    }
  }
  
  return null;
}

/**
 * Check if description contains a known merchant (substring match)
 * Returns the merchant pattern if found, null otherwise
 * @deprecated Use findMerchantByBaseWords instead for better word-based matching
 */
export function findMerchantInDescription(description: string, merchantPatterns: string[]): string | null {
  // Use the new base word matching
  return findMerchantByBaseWords(description, merchantPatterns);
}

