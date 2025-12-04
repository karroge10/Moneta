import { NextRequest, NextResponse } from 'next/server';
import { UploadedTransaction, TransactionUploadMetadata } from '@/types/dashboard';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeMerchantName, extractMerchantFromDescription, fuzzyMatch, findMerchantByBaseWords, detectSpecialTransactionType } from '@/lib/merchant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEBUG_PATTERNS = [
  'განათლება - საქართველოს ეროვნული უნივერსიტეტი',
  'Exchange amount',
  'ZATER DONERI',
  'SNEAKERHUB',
  'MANO',
  'ლარის გადარიცხვის საკომისიო',
  'უნაღდო კონვერტაცია',
  'Personal Transfer',
];

const debugPatternSet = DEBUG_PATTERNS.map(pattern => pattern.toLowerCase());

function shouldDebugTransaction(description: string): boolean {
  const lowered = description.toLowerCase();
  return debugPatternSet.some(pattern => lowered.includes(pattern));
}

export async function POST(request: NextRequest) {
  console.log('\n\n' + '='.repeat(80));
  console.log('[TRANSACTION IMPORT] Starting import process...');
  console.log('='.repeat(80) + '\n');
  
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const transactions = body?.transactions as UploadedTransaction[];
    const metadata = body?.metadata as TransactionUploadMetadata | undefined;
    const statementCurrencyIdInput = body?.statementCurrencyId;
    const merchantsToLearn = body?.merchantsToLearn as Array<{ description: string; categoryId: number }> | undefined;

    console.log(`[TRANSACTION IMPORT] Received ${transactions?.length || 0} transactions to import\n`);

    if (!Array.isArray(transactions)) {
      console.error('[TRANSACTION IMPORT] ERROR: transactions is not an array');
      return NextResponse.json(
        { error: 'transactions must be an array' },
        { status: 400 },
      );
    }

    let resolvedCurrency: { id: number; alias: string; symbol: string } | null = null;
    let requestedCurrencyId: number | null = null;
    if (typeof statementCurrencyIdInput === 'number') {
      requestedCurrencyId = statementCurrencyIdInput;
    } else if (typeof statementCurrencyIdInput === 'string' && statementCurrencyIdInput.trim() !== '') {
      const parsed = Number.parseInt(statementCurrencyIdInput, 10);
      if (!Number.isNaN(parsed)) {
        requestedCurrencyId = parsed;
      }
    }

    if (requestedCurrencyId) {
      const currencyRecord = await db.currency.findUnique({
        where: { id: requestedCurrencyId },
        select: { id: true, alias: true, symbol: true },
      });
      if (currencyRecord) {
        resolvedCurrency = currencyRecord;
      }
    }

    if (!resolvedCurrency && metadata?.currency) {
      const currencyRecord = await db.currency.findFirst({
        where: {
          alias: metadata.currency.toUpperCase(),
        },
        select: { id: true, alias: true, symbol: true },
      });
      if (currencyRecord) {
        resolvedCurrency = currencyRecord;
      }
    }

    if (!resolvedCurrency && user.currencyId) {
      const userCurrencyRecord = await db.currency.findUnique({
        where: { id: user.currencyId },
        select: { id: true, alias: true, symbol: true },
      });
      if (userCurrencyRecord) {
        resolvedCurrency = userCurrencyRecord;
      }
    }

    if (!resolvedCurrency) {
      const defaultCurrency = await db.currency.findFirst({
        select: { id: true, alias: true, symbol: true },
      });
      if (!defaultCurrency) {
        return NextResponse.json(
          { error: 'No currency configured. Please set up currencies first.' },
          { status: 500 },
        );
      }
      resolvedCurrency = defaultCurrency;
    }

    const currencyId = resolvedCurrency.id;

    // Pre-fetch all categories to build a lookup map (do this first)
    const allCategories = await db.category.findMany();
    const categoryMap = new Map<string, number>();
    allCategories.forEach((cat: { name: string; id: number }) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    });

    // Pre-fetch global merchants (shared by all users)
    const globalMerchants = await db.merchantGlobal.findMany();
    const globalMerchantMap = new Map<string, number>();
    const globalMerchantPatterns: string[] = [];
    globalMerchants.forEach((merchant: { namePattern: string; categoryId: number }) => {
      // Store both original and normalized patterns for matching
      const normalizedPattern = normalizeMerchantName(merchant.namePattern);
      globalMerchantMap.set(normalizedPattern, merchant.categoryId);
      // Also store original pattern for substring matching
      globalMerchantPatterns.push(merchant.namePattern);
      console.log(`[merchant-setup] Global merchant: "${merchant.namePattern}" -> normalized: "${normalizedPattern}" -> categoryId: ${merchant.categoryId}`);
    });
    console.log(`[merchant-setup] Loaded ${globalMerchants.length} global merchants`);

    // Pre-fetch user's merchant mappings (learned from previous corrections - overrides global)
    const userMerchants = await db.merchant.findMany({
      where: { userId: user.id },
      include: { category: true },
    });
    const userMerchantMap = new Map<string, number>();
    const userMerchantPatterns: string[] = [];
    userMerchants.forEach((merchant: { namePattern: string; categoryId: number }) => {
      // Store both original and normalized patterns for matching
      const normalizedPattern = normalizeMerchantName(merchant.namePattern);
      userMerchantMap.set(normalizedPattern, merchant.categoryId);
      // Also store original pattern for substring matching
      userMerchantPatterns.push(merchant.namePattern);
      console.log(`[merchant-setup] User merchant: "${merchant.namePattern}" -> normalized: "${normalizedPattern}" -> categoryId: ${merchant.categoryId}`);
    });
    console.log(`[merchant-setup] Loaded ${userMerchants.length} user merchants`);

    // Map Python processor category names to database category names
    const categoryNameMapping: Record<string, string> = {
      'transportation': 'transportation', // Direct match
      'transport': 'transportation', // Python uses "Transport", DB has "Transportation"
      'utilities': 'other', // Map old Utilities category to Other
    };

    console.log(`[merchant-import] Processing ${transactions.length} transactions`);
    
    // Sanitize and prepare transactions for database with category matching
    let matchedCount = 0;
    let unmatchedCount = 0;
    const unmatchedTransactions: Array<{
      original: string;
      extracted: string;
      normalized: string;
      reasons: string[];
      checkedPatterns: Array<{ pattern: string; similarity: number; type: string }>;
    }> = [];
    
    const transactionsToCreate = transactions
      .map((item: UploadedTransaction) => {
        const amount = Number(item.amount) || 0;
        const date = new Date(item.date);
        
        // Determine type: positive = income, negative = expense
        const type = amount >= 0 ? 'income' : 'expense';
        const absoluteAmount = Math.abs(amount);

        // Match category: Priority 0) User-selected category (from UI), 1) Special transaction types, 2) User override, 3) Global merchant DB, 4) Python suggestion
        let categoryId = null;
        let matchedMerchant: string | null = null;
        let matchMethod: string | null = null;
        
        // Check for special transaction types FIRST (before user selection or Python suggestions)
        // Always use translated description for checks (categories are in English)
        const descriptionForMatching = item.translatedDescription || item.description;
        const specialType = detectSpecialTransactionType(descriptionForMatching);
        
        // Note: All transactions are saved - no transactions are filtered out completely
        // Special types like roundup, currency exchange, transfers, deposits, and ATM withdrawals
        // return null to be saved but remain uncategorized (no merchant matching)
        
        // Priority 0: If user provided a category in the UI, use it directly (skip all matching)
        // If user explicitly set category to null/empty, also skip matching (save as uncategorized)
        if (item.category !== undefined && item.category !== null && item.category !== '') {
          let categoryName = item.category.toLowerCase();
          
          // Apply mapping if needed
          if (categoryNameMapping[categoryName]) {
            categoryName = categoryNameMapping[categoryName];
          }
          
          categoryId = categoryMap.get(categoryName) ?? null;
          if (categoryId) {
            matchMethod = 'user-selected';
            console.log(`[merchant-match] ✓ User-selected category: "${categoryName}" -> categoryId: ${categoryId}`);
          } else {
            // User selected a category but it wasn't found - save as uncategorized (don't re-run matching)
            console.log(`[merchant-match] ⚠ User-selected category "${categoryName}" not found, saving as uncategorized`);
          }
        } else if (item.category === null || item.category === '') {
          // User explicitly cleared the category - save as uncategorized (don't re-run matching)
          console.log(`[merchant-match] ⊘ User cleared category, saving as uncategorized`);
        }
        
        // Extract and normalize merchant name (needed for matching and logging)
        const merchantName = extractMerchantFromDescription(descriptionForMatching);
        const normalizedMerchant = normalizeMerchantName(merchantName);
        
        // Track why this transaction didn't match (for unmatched transactions)
        const unmatchedReasons: string[] = [];
        const checkedPatterns: Array<{ pattern: string; similarity: number; type: string }> = [];
        
        // Skip auto-categorization for income transactions (amount >= 0)
        // Income transactions should remain uncategorized unless explicitly set by user
        if (type === 'income' && !categoryId) {
          console.log(`[merchant-match] ⊘ Skipping auto-categorization for income transaction: "${item.description.substring(0, 50)}..."`);
          // Keep categoryId as null (uncategorized)
        }
        // Only run matching logic if user didn't provide a category and it's not an income transaction
        else if (!categoryId) {
          let skipMerchantMatching = false;
          
          if (specialType && specialType !== 'EXCLUDE') {
            // Special type that should be categorized (e.g., commissions -> other)
            // Note: All transactions are saved - withdrawals, transfers, etc. return null and remain uncategorized
            const specialCategoryId = categoryMap.get(specialType.toLowerCase());
            if (specialCategoryId) {
              categoryId = specialCategoryId;
              matchMethod = 'special-transaction-type';
              skipMerchantMatching = true; // Already categorized, skip merchant matching
            }
          }
          
          // Get all merchant patterns for substring matching (use original patterns, not normalized)
          const allUserPatterns = userMerchantPatterns;
          const allGlobalPatterns = globalMerchantPatterns;
          
          // Priority 1: User override (learned from corrections) - only if not skipped
          if (!skipMerchantMatching) {
          // Try exact match first
          if (userMerchantMap.has(normalizedMerchant)) {
            categoryId = userMerchantMap.get(normalizedMerchant) ?? null;
            matchedMerchant = normalizedMerchant;
            matchMethod = 'user-exact';
            console.log(`[merchant-match] ✓ User exact match: "${matchedMerchant}" -> categoryId: ${categoryId}`);
          } else {
            unmatchedReasons.push(`User exact match: "${normalizedMerchant}" not found in user merchant map`);
            
            // Try word-based matching in description (matches base words like "yandex" in "YANDEX.GO")
            const foundMerchant = findMerchantByBaseWords(descriptionForMatching, allUserPatterns);
            if (foundMerchant) {
              const foundNormalized = normalizeMerchantName(foundMerchant);
              if (userMerchantMap.has(foundNormalized)) {
                categoryId = userMerchantMap.get(foundNormalized) ?? null;
                matchedMerchant = foundMerchant;
                matchMethod = 'user-word-match';
                console.log(`[merchant-match] ✓ User word match: "${foundMerchant}" (normalized: "${foundNormalized}") -> categoryId: ${categoryId}`);
              } else {
                unmatchedReasons.push(`User word match: found "${foundMerchant}" but not in user merchant map`);
              }
            } else {
              unmatchedReasons.push(`User word match: no base words found in description`);
            }
            
            // Fuzzy user merchant match - fallback with stricter threshold
            if (!categoryId) {
              let bestMatch: { pattern: string; catId: number; similarity: number } | null = null;
              for (const [pattern, catId] of userMerchantMap.entries()) {
                const similarity = fuzzyMatch(normalizedMerchant, pattern);
                // Also try matching against translated description
                const descSimilarity = fuzzyMatch(descriptionForMatching.toLowerCase(), pattern);
                const maxSimilarity = Math.max(similarity, descSimilarity);
              checkedPatterns.push({ pattern, similarity: maxSimilarity, type: 'user-fuzzy' });
              const threshold = 0.85;
              if (maxSimilarity >= threshold) {
                if (!bestMatch || maxSimilarity > bestMatch.similarity) {
                  bestMatch = { pattern, catId, similarity: maxSimilarity };
                }
              }
              }
              if (bestMatch) {
                categoryId = bestMatch.catId;
                matchedMerchant = bestMatch.pattern;
                matchMethod = `user-fuzzy-${bestMatch.similarity.toFixed(2)}`;
                console.log(`[merchant-match] ✓ User fuzzy match: "${bestMatch.pattern}" (similarity: ${bestMatch.similarity.toFixed(2)}) -> categoryId: ${categoryId}`);
              } else {
                unmatchedReasons.push(`User fuzzy match: best similarity ${checkedPatterns.length > 0 ? Math.max(...checkedPatterns.filter(p => p.type === 'user-fuzzy').map(p => p.similarity)).toFixed(2) : '0.00'} < 0.65 threshold`);
              }
            }
          }
        }
        
        // Priority 2: Global merchant database (if no user override and not skipped)
        if (!skipMerchantMatching && !categoryId) {
          // Try exact match first
          if (globalMerchantMap.has(normalizedMerchant)) {
            categoryId = globalMerchantMap.get(normalizedMerchant) ?? null;
            matchedMerchant = normalizedMerchant;
            matchMethod = 'global-exact';
            console.log(`[merchant-match] ✓ Global exact match: "${matchedMerchant}" -> categoryId: ${categoryId}`);
          } else {
            unmatchedReasons.push(`Global exact match: "${normalizedMerchant}" not found in global merchant map`);
            
            // Try word-based matching in description (matches base words like "yandex" in "YANDEX.GO")
            const foundMerchant = findMerchantByBaseWords(descriptionForMatching, allGlobalPatterns);
            if (foundMerchant) {
              const foundNormalized = normalizeMerchantName(foundMerchant);
              if (globalMerchantMap.has(foundNormalized)) {
                categoryId = globalMerchantMap.get(foundNormalized) ?? null;
                matchedMerchant = foundMerchant;
                matchMethod = 'global-word-match';
                console.log(`[merchant-match] ✓ Global word match: "${foundMerchant}" (normalized: "${foundNormalized}") -> categoryId: ${categoryId}`);
              } else {
                unmatchedReasons.push(`Global word match: found "${foundMerchant}" (normalized: "${foundNormalized}") but not in global merchant map`);
              }
            } else {
              unmatchedReasons.push(`Global word match: no base words found in description`);
            }
            
            // Fuzzy global merchant match - fallback with stricter threshold
            if (!categoryId) {
              let bestMatch: { pattern: string; catId: number; similarity: number } | null = null;
              // Only check top candidates to avoid too much logging
              const topCandidates: Array<{ pattern: string; catId: number; similarity: number }> = [];
              for (const [pattern, catId] of globalMerchantMap.entries()) {
                const similarity = fuzzyMatch(normalizedMerchant, pattern);
                // Also try matching against translated description
                const descSimilarity = fuzzyMatch(descriptionForMatching.toLowerCase(), pattern);
                const maxSimilarity = Math.max(similarity, descSimilarity);
              checkedPatterns.push({ pattern, similarity: maxSimilarity, type: 'global-fuzzy' });
              topCandidates.push({ pattern, catId, similarity: maxSimilarity });
              const threshold = 0.85;
              if (maxSimilarity >= threshold) {
                if (!bestMatch || maxSimilarity > bestMatch.similarity) {
                  bestMatch = { pattern, catId, similarity: maxSimilarity };
                }
              }
              }
              // Sort and show top 5 candidates
              topCandidates.sort((a, b) => b.similarity - a.similarity);
              const top5 = topCandidates.slice(0, 5);
              if (top5.length > 0 && top5[0].similarity > 0) {
                unmatchedReasons.push(`Global fuzzy match: top candidates: ${top5.map(c => `"${c.pattern}" (${c.similarity.toFixed(2)})`).join(', ')}`);
              }
              if (bestMatch) {
                categoryId = bestMatch.catId;
                matchedMerchant = bestMatch.pattern;
                matchMethod = `global-fuzzy-${bestMatch.similarity.toFixed(2)}`;
                console.log(`[merchant-match] ✓ Global fuzzy match: "${bestMatch.pattern}" (similarity: ${bestMatch.similarity.toFixed(2)}) -> categoryId: ${categoryId}`);
              } else {
                unmatchedReasons.push(`Global fuzzy match: best similarity ${top5.length > 0 ? top5[0].similarity.toFixed(2) : '0.00'} < 0.65 threshold`);
              }
            }
          }
        }
        
          // Priority 3: Python processor suggestion (fallback) - only if no category found yet
          if (!categoryId && item.category) {
            let categoryName = item.category.toLowerCase();
            
            // Apply mapping if needed
            if (categoryNameMapping[categoryName]) {
              categoryName = categoryNameMapping[categoryName];
            }
            
            categoryId = categoryMap.get(categoryName) ?? null;
            if (categoryId) {
              matchMethod = 'python-suggestion';
              console.log(`[merchant-match] ✓ Python suggestion: "${categoryName}" -> categoryId: ${categoryId}`);
            } else {
              unmatchedReasons.push(`Python suggestion: category "${item.category}" (mapped to "${categoryName}") not found in category map`);
            }
          } else if (!categoryId && !item.category) {
            unmatchedReasons.push(`Python suggestion: no category provided by processor`);
          }
        } // End of if (!categoryId) block - only run matching if user didn't select a category
        
        if (shouldDebugTransaction(item.description)) {
          const matchedCategoryName = categoryId ? [...categoryMap.entries()].find(([name, id]) => id === categoryId)?.[0] ?? null : null;
          console.log('[import-debug]', {
            description: item.description,
            type,
            specialType,
            merchantName,
            normalizedMerchant,
            categoryId,
            matchedCategoryName,
            matchMethod,
            userExact: userMerchantMap.has(normalizedMerchant),
            globalExact: globalMerchantMap.has(normalizedMerchant),
          });
        }

        // Log if no match found
        if (!categoryId) {
          unmatchedCount++;
          unmatchedTransactions.push({
            original: item.description,
            extracted: merchantName,
            normalized: normalizedMerchant,
            reasons: unmatchedReasons,
            checkedPatterns: checkedPatterns.filter(p => p.similarity > 0).sort((a, b) => b.similarity - a.similarity).slice(0, 10),
          });
        } else {
          matchedCount++;
          if (matchedMerchant) {
            console.log(`[merchant-match] ✓ Match: "${matchedMerchant}" via ${matchMethod} -> categoryId: ${categoryId}`);
          } else {
            console.log(`[merchant-match] ✓ Match via ${matchMethod} -> categoryId: ${categoryId}`);
          }
        }

        return {
          userId: user.id,
          type,
          amount: absoluteAmount,
          // Store the original description (user can edit it later if needed)
          description: item.description,
          source: 'pdf_import', // Always use 'pdf_import' instead of PDF filename
          date,
          categoryId,
          currencyId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => 
        item !== null && Boolean(item?.description) && !isNaN(item?.date.getTime())
      );

    // Log comprehensive summary - VERY VISIBLE
    console.log('\n\n');
    console.log('█'.repeat(80));
    console.log('█'.repeat(80));
    console.log('█'.repeat(80));
    console.log('█'.repeat(80));
    console.log(`█  [CATEGORIZATION SUMMARY]`);
    console.log('█'.repeat(80));
    console.log(`█  Total transactions: ${transactions.length}`);
    console.log(`█  ✓ Categorized: ${matchedCount} (${((matchedCount / transactions.length) * 100).toFixed(1)}%)`);
    console.log(`█  ✗ Uncategorized: ${unmatchedCount} (${((unmatchedCount / transactions.length) * 100).toFixed(1)}%)`);
    console.log('█'.repeat(80));
    console.log('█'.repeat(80));
    console.log('█'.repeat(80));
    console.log('█'.repeat(80));
    console.log('\n');
    
    if (unmatchedTransactions.length > 0) {
      console.log('\n');
      console.log('█'.repeat(80));
      console.log(`█  [UNCATEGORIZED TRANSACTIONS - ${unmatchedTransactions.length} total]`);
      console.log('█'.repeat(80));
      console.log('█'.repeat(80));
      unmatchedTransactions.forEach((tx: { original: string; extracted: string; normalized: string; reasons: string[]; checkedPatterns: Array<{ pattern: string; similarity: number; type: string }> }, index: number) => {
        console.log(`\n█  ┌─ Transaction #${index + 1} ────────────────────────────────────────────────────────────`);
        console.log(`█  │ Original: "${tx.original}"`);
        console.log(`█  │ Extracted: "${tx.extracted}"`);
        console.log(`█  │ Normalized: "${tx.normalized}"`);
        console.log(`█  │ Reasons why it didn't match:`);
        tx.reasons.forEach((reason: string) => {
          console.log(`█  │   • ${reason}`);
        });
        if (tx.checkedPatterns.length > 0) {
          console.log(`█  │ Top checked patterns (similarity > 0):`);
          tx.checkedPatterns.slice(0, 5).forEach((pattern: { pattern: string; similarity: number; type: string }) => {
            console.log(`█  │   • "${pattern.pattern}" (${pattern.type}): ${pattern.similarity.toFixed(3)}`);
          });
        }
        console.log(`█  └────────────────────────────────────────────────────────────────────────────`);
      });
      console.log('\n');
      console.log('█'.repeat(80));
      console.log('█'.repeat(80));
      console.log('\n');
    }
    
    console.log(`[merchant-import] Summary: ${matchedCount} matched, ${unmatchedCount} unmatched out of ${transactions.length} transactions`);

    if (!transactionsToCreate.length) {
      return NextResponse.json(
        { error: 'No valid transactions provided.' },
        { status: 422 },
      );
    }

    // Bulk insert all transactions at once (much faster than one-by-one)
    await db.transaction.createMany({
      data: transactionsToCreate,
      skipDuplicates: true,
    });

    // Fetch the created transactions for response (optimized query)
    // Use a more efficient query: get recent transactions by createdAt timestamp
    // This avoids expensive date range queries on large datasets
    const now = new Date();
    const createdTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        source: 'pdf_import', // Always use 'pdf_import' instead of PDF filename
        createdAt: {
          gte: new Date(now.getTime() - 60000), // Last 60 seconds (should be enough for import)
        },
      },
      orderBy: { createdAt: 'desc' },
      take: transactionsToCreate.length,
    });

    // Fetch categories for the response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryIds = [...new Set(createdTransactions.map((tx: any) => tx.categoryId).filter(Boolean))];
    const categories = categoryIds.length > 0 
      ? await db.category.findMany({
          where: { id: { in: categoryIds as number[] } },
        })
      : [];
    const categoryById = new Map(categories.map((cat: { id: number; name: string }) => [cat.id, cat.name]));

    // Transform to match response format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseTransactions = createdTransactions.map((tx: any) => ({
      id: tx.id.toString(),
      date: tx.date.toISOString().split('T')[0],
      description: tx.description,
      translatedDescription: tx.description, // Same as description since we stored the translated version
      amount: tx.type === 'income' ? tx.amount : -tx.amount,
      category: tx.categoryId ? categoryById.get(tx.categoryId) ?? null : null,
    }));

    console.info('[transactions/import] persisted transactions', responseTransactions.length);

    // Learn merchant mappings if provided (batched for performance)
    if (merchantsToLearn && merchantsToLearn.length > 0) {
      console.log(`[merchants/learn] Learning ${merchantsToLearn.length} merchant mappings`);
      const { normalizeMerchantName, extractMerchantFromDescription } = await import('@/lib/merchant');
      
      // Process merchants in parallel batches (max 10 concurrent)
      const batchSize = 10;
      const batches: Array<typeof merchantsToLearn> = [];
      for (let i = 0; i < merchantsToLearn.length; i += batchSize) {
        batches.push(merchantsToLearn.slice(i, i + batchSize));
      }
      
      // Process batches sequentially, but items within batch in parallel
      for (const batch of batches) {
        await Promise.all(
          batch.map(async (item) => {
            try {
              const merchantName = extractMerchantFromDescription(item.description);
              const normalizedMerchant = normalizeMerchantName(merchantName);
              
              if (normalizedMerchant && normalizedMerchant.length >= 2) {
                await db.merchant.upsert({
                  where: {
                    userId_namePattern: {
                      userId: user.id,
                      namePattern: normalizedMerchant,
                    },
                  },
                  update: {
                    categoryId: item.categoryId,
                    matchCount: { increment: 1 },
                    updatedAt: new Date(),
                  },
                  create: {
                    userId: user.id,
                    namePattern: normalizedMerchant,
                    categoryId: item.categoryId,
                    matchCount: 1,
                  },
                });
                console.log(`[merchants/learn] ✓ Learned: "${normalizedMerchant}" -> categoryId: ${item.categoryId}`);
              } else {
                console.warn(`[merchants/learn] ⚠ Could not extract merchant from: "${item.description}"`);
              }
            } catch (error) {
              // Silently fail - learning is optional
              console.debug('[merchants/learn] Failed to learn merchant mapping', error);
            }
          })
        );
      }
      console.log(`[merchants/learn] Completed learning ${merchantsToLearn.length} merchant mappings`);
    }

    // Create notification about successful import
    try {
      const now = new Date();
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'PDF Processing',
          text: `Successfully imported ${responseTransactions.length} transaction${responseTransactions.length !== 1 ? 's' : ''}!`,
          date: now,
          time: now.toTimeString().split(' ')[0],
          read: false,
        },
      });
    } catch (notifError) {
      console.error('[transactions/import] Failed to create notification:', notifError);
      // Don't fail the import if notification creation fails
    }

    return NextResponse.json({ ok: true, transactions: responseTransactions });
  } catch (error) {
    console.error('[transactions/import] error', error);
    
    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: 'Unable to import transactions.' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? '10', 10)));
    const search = (searchParams.get('search') ?? '').toLowerCase();
    const category = searchParams.get('category');

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      userId: user.id,
    };

    if (category) {
      // Find category by name
      const categoryRecord = await db.category.findFirst({
        where: {
          name: {
            equals: category,
            mode: 'insensitive',
          },
        },
      });

      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
      } else {
        // If category not found, return empty results
        return NextResponse.json({
          transactions: [],
          total: 0,
          page,
          pageSize,
        });
      }
    }

    if (search) {
      where.description = { contains: search, mode: 'insensitive' };
    }

    // Get total count
    const total = await db.transaction.count({ where });

    // Get paginated results
    const transactions = await db.transaction.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { date: 'desc' },
      include: {
        category: true,
      },
    });

    // Transform to match UploadedTransaction format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageItems = transactions.map((tx: any) => ({
      id: tx.id.toString(),
      date: tx.date.toISOString().split('T')[0],
      description: tx.description,
      translatedDescription: tx.description, // Same as description
      amount: tx.type === 'income' ? tx.amount : -tx.amount,
      category: tx.category?.name ?? null,
    }));

    return NextResponse.json({
      transactions: pageItems,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[transactions/import] GET error', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: 'Unable to fetch transactions.' },
      { status: 500 },
    );
  }
}
