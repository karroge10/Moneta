import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeMerchantName, extractMerchantFromDescription, fuzzyMatch, findMerchantByBaseWords, detectSpecialTransactionType } from '@/lib/merchant';
import { UploadedTransaction } from '@/types/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Applies merchant-based categorization to transactions from the database
 * This replicates the EXACT logic from the import route to ensure consistency
 * 
 * Matching priority:
 * 1. Special transaction types (commissions → "Other", others → null/uncategorized)
 * 2. Income transactions → remain uncategorized (null)
 * 3. User-specific merchant overrides (from MerchantUser table)
 * 4. Global merchant database (from MerchantGlobal table)
 * 5. Python processor suggestion (fallback)
 * 
 * Note: All transactions are saved - no transactions are filtered out completely.
 * Roundup, currency exchange, transfers, deposits, and ATM withdrawals are saved but remain uncategorized.
 * 
 * Matching strategies (in order):
 * - Exact match (normalized merchant name)
 * - Word-based match (using findMerchantByBaseWords)
 * - Fuzzy match (similarity >= 0.65 threshold)
 */
async function analyzeCategorization(transactions: UploadedTransaction[], userId: number): Promise<UploadedTransaction[]> {
  console.log(`[categorization] Starting categorization for ${transactions.length} transactions (userId: ${userId})`);
  
  // Pre-fetch categories
  const allCategories = await db.category.findMany();
  const categoryMap = new Map<string, number>();
  allCategories.forEach((cat: { name: string; id: number }) => {
    categoryMap.set(cat.name.toLowerCase(), cat.id);
  });

  // Pre-fetch global merchants
  const globalMerchants = await db.merchantGlobal.findMany();
  const globalMerchantMap = new Map<string, number>();
  const globalMerchantPatterns: string[] = [];
  globalMerchants.forEach((merchant: { namePattern: string; categoryId: number }) => {
    const normalizedPattern = normalizeMerchantName(merchant.namePattern);
    globalMerchantMap.set(normalizedPattern, merchant.categoryId);
    globalMerchantPatterns.push(merchant.namePattern);
  });

  // Pre-fetch user-specific merchants (learned from corrections - overrides global)
  const userMerchants = await db.merchant.findMany({
    where: { userId },
    include: { category: true },
  });
  const userMerchantMap = new Map<string, number>();
  const userMerchantPatterns: string[] = [];
  userMerchants.forEach((merchant: { namePattern: string; categoryId: number }) => {
    const normalizedPattern = normalizeMerchantName(merchant.namePattern);
    userMerchantMap.set(normalizedPattern, merchant.categoryId);
    userMerchantPatterns.push(merchant.namePattern);
  });

  console.log(`[categorization] Loaded ${allCategories.length} categories, ${globalMerchants.length} global merchants, ${userMerchants.length} user merchants`);

  // Category name mapping (Python processor → database)
  const categoryNameMapping: Record<string, string> = {
    'transportation': 'transportation',
    'transport': 'transportation',
    'utilities': 'other',
  };

  // Apply categorization logic to each transaction (matching import route logic)
  const categorizedTransactions = transactions
    .map((tx) => {
      // CRITICAL: Use translatedDescription for matching (descriptions are in Georgian)
      const descriptionForMatching = tx.translatedDescription || tx.description;
      
      // Check for special transaction types FIRST
      const specialType = detectSpecialTransactionType(descriptionForMatching);
      
      // Note: All transactions are saved - no transactions are filtered out completely
      // Special types like roundup, currency exchange, transfers, deposits, and ATM withdrawals
      // return null to be saved but remain uncategorized (no merchant matching)
      
      // Determine transaction type based on amount
      const type = tx.amount >= 0 ? 'income' : 'expense';
      
      // Extract merchant name for matching (needed for all transactions)
      const merchantName = extractMerchantFromDescription(descriptionForMatching);
      const normalizedMerchant = normalizeMerchantName(merchantName);
      
      let categoryId: number | null = null;
      let skipMerchantMatching = false;
      
      // Skip auto-categorization for income transactions (amount >= 0)
      // Income transactions should remain uncategorized unless explicitly set by user
      // Note: In callback route, there's no user selection, so income always stays null
      if (type === 'income' && !categoryId) {
        console.log(`[categorization] ⊘ Skipping auto-categorization for income transaction: "${tx.description.substring(0, 50)}..."`);
        // Keep categoryId as null (uncategorized)
        return {
          ...tx,
          category: null,
        };
      }
      
      // Handle special transaction types that should be categorized (e.g., commissions → "Other")
      if (specialType && specialType !== 'EXCLUDE') {
        const specialCategoryId = categoryMap.get(specialType.toLowerCase());
        if (specialCategoryId) {
          categoryId = specialCategoryId;
          skipMerchantMatching = true;
          console.log(`[categorization] ✓ Special type: "${specialType}" -> categoryId: ${categoryId}`);
        }
      }
      
      // Priority 1: User-specific merchant overrides (only if not skipped)
      if (!skipMerchantMatching && !categoryId) {
        // Exact match
        if (userMerchantMap.has(normalizedMerchant)) {
          categoryId = userMerchantMap.get(normalizedMerchant)!;
          console.log(`[categorization] ✓ User exact: "${merchantName}" -> categoryId: ${categoryId}`);
        } else {
          // Word-based match
          const foundMerchant = findMerchantByBaseWords(descriptionForMatching, userMerchantPatterns);
          if (foundMerchant) {
            const foundNormalized = normalizeMerchantName(foundMerchant);
            if (userMerchantMap.has(foundNormalized)) {
              categoryId = userMerchantMap.get(foundNormalized)!;
              console.log(`[categorization] ✓ User word: "${foundMerchant}" -> categoryId: ${categoryId}`);
            }
          }
          
          // Fuzzy match (threshold: 0.65)
          if (!categoryId) {
            let bestMatch: { pattern: string; catId: number; similarity: number } | null = null;
            for (const [pattern, catId] of userMerchantMap.entries()) {
              const similarity = fuzzyMatch(normalizedMerchant, pattern);
              const descSimilarity = fuzzyMatch(descriptionForMatching.toLowerCase(), pattern);
              const maxSimilarity = Math.max(similarity, descSimilarity);
              if (maxSimilarity >= 0.65) {
                if (!bestMatch || maxSimilarity > bestMatch.similarity) {
                  bestMatch = { pattern, catId, similarity: maxSimilarity };
                }
              }
            }
            if (bestMatch) {
              categoryId = bestMatch.catId;
              console.log(`[categorization] ✓ User fuzzy: "${bestMatch.pattern}" (${bestMatch.similarity.toFixed(2)}) -> categoryId: ${categoryId}`);
            }
          }
        }
      }
      
      // Priority 2: Global merchant database (only if not skipped and no user match)
      if (!skipMerchantMatching && !categoryId) {
        // Exact match
        if (globalMerchantMap.has(normalizedMerchant)) {
          categoryId = globalMerchantMap.get(normalizedMerchant)!;
          console.log(`[categorization] ✓ Global exact: "${merchantName}" -> categoryId: ${categoryId}`);
        } else {
          // Word-based match
          const foundMerchant = findMerchantByBaseWords(descriptionForMatching, globalMerchantPatterns);
          if (foundMerchant) {
            const foundNormalized = normalizeMerchantName(foundMerchant);
            if (globalMerchantMap.has(foundNormalized)) {
              categoryId = globalMerchantMap.get(foundNormalized)!;
              console.log(`[categorization] ✓ Global word: "${foundMerchant}" -> categoryId: ${categoryId}`);
            }
          }
          
          // Fuzzy match (threshold: 0.65)
          if (!categoryId) {
            let bestMatch: { pattern: string; catId: number; similarity: number } | null = null;
            for (const [pattern, catId] of globalMerchantMap.entries()) {
              const similarity = fuzzyMatch(normalizedMerchant, pattern);
              const descSimilarity = fuzzyMatch(descriptionForMatching.toLowerCase(), pattern);
              const maxSimilarity = Math.max(similarity, descSimilarity);
              if (maxSimilarity >= 0.65) {
                if (!bestMatch || maxSimilarity > bestMatch.similarity) {
                  bestMatch = { pattern, catId, similarity: maxSimilarity };
                }
              }
            }
            if (bestMatch) {
              categoryId = bestMatch.catId;
              console.log(`[categorization] ✓ Global fuzzy: "${bestMatch.pattern}" (${bestMatch.similarity.toFixed(2)}) -> categoryId: ${categoryId}`);
            }
          }
        }
      }
      
      // Priority 3: Python processor suggestion (fallback)
      if (!categoryId && tx.category) {
        let categoryName = tx.category.toLowerCase();
        
        // Apply mapping if needed
        if (categoryNameMapping[categoryName]) {
          categoryName = categoryNameMapping[categoryName];
        }
        
        categoryId = categoryMap.get(categoryName) ?? null;
        if (categoryId) {
          console.log(`[categorization] ✓ Python: "${categoryName}" -> categoryId: ${categoryId}`);
        }
      }
      
      // Convert categoryId to category name
      if (categoryId) {
        const matchedCategory = allCategories.find(c => c.id === categoryId);
        if (matchedCategory) {
          return {
            ...tx,
            category: matchedCategory.name,
          };
        }
      }
      
      // No match found - keep as uncategorized (null)
      return {
        ...tx,
        category: null,
      };
    })
    .filter((tx): tx is UploadedTransaction => tx !== null); // Remove excluded transactions
  
  console.log(`[categorization] Completed: ${categorizedTransactions.length} transactions (${transactions.length - categorizedTransactions.length} excluded)`);
  
  return categorizedTransactions;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const expectedSecret = process.env.INTERNAL_API_SECRET;
    const providedSecret = request.headers.get('x-internal-secret');
    if (expectedSecret && providedSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await params;
    const body = await request.json();
    const { progress, status, processedCount, totalCount, result } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    // Basic validation
    if (typeof progress !== 'number' && !status) {
      return NextResponse.json({ error: 'Missing progress or status' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (typeof progress === 'number') {
      updateData.progress = Math.min(100, Math.max(0, progress));
    }

    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completedAt = new Date();
        updateData.progress = 100;
      }
    }

    // Store transaction counts for better time estimation
    if (typeof processedCount === 'number') {
      updateData.processedCount = processedCount;
    }
    if (typeof totalCount === 'number') {
      updateData.totalCount = totalCount;
    }

    // Store final result if provided (when marking as completed)
    // Apply merchant categorization before storing
    if (result !== undefined && status === 'completed') {
      // Run categorization on the transactions
      if (result.transactions && Array.isArray(result.transactions) && result.transactions.length > 0) {
        console.log(`[job-progress] Running categorization for ${result.transactions.length} transactions`);
        
        // Get userId from the job
        const job = await db.pdfProcessingJob.findUnique({
          where: { id: jobId },
          select: { userId: true },
        });
        
        if (!job) {
          console.error(`[job-progress] Job ${jobId} not found`);
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        
        result.transactions = await analyzeCategorization(result.transactions, job.userId);
        console.log(`[job-progress] Categorization complete`);
      }
      updateData.result = result;
    } else if (result !== undefined) {
      updateData.result = result;
    }

    // Use prisma update instead of raw SQL for simplicity unless there's a specific reason
    await db.pdfProcessingJob.update({
      where: { id: jobId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[job-progress] Failed to update progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

