import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldCreateNotification } from '@/lib/notification-settings';
import { normalizeMerchantName, extractMerchantFromDescription, fuzzyMatch, findMerchantByBaseWords, detectSpecialTransactionType } from '@/lib/merchant';
import { UploadedTransaction } from '@/types/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


async function analyzeCategorization(transactions: UploadedTransaction[], userId: number): Promise<UploadedTransaction[]> {
  console.log(`[categorization] Starting categorization for ${transactions.length} transactions (userId: ${userId})`);
  
  
  const allCategories = await db.category.findMany();
  const categoryMap = new Map<string, number>();
  allCategories.forEach((cat: { name: string; id: number }) => {
    categoryMap.set(cat.name.toLowerCase(), cat.id);
  });

  
  const globalMerchants = await db.merchantGlobal.findMany();
  const globalMerchantMap = new Map<string, number>();
  const globalMerchantPatterns: string[] = [];
  globalMerchants.forEach((merchant: { namePattern: string; categoryId: number }) => {
    const normalizedPattern = normalizeMerchantName(merchant.namePattern);
    globalMerchantMap.set(normalizedPattern, merchant.categoryId);
    globalMerchantPatterns.push(merchant.namePattern);
  });

  
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

  
  const categoryNameMapping: Record<string, string> = {
    'transportation': 'transportation',
    'transport': 'transportation',
    'utilities': 'other',
  };

  
  const categorizedTransactions = transactions
    .map((tx) => {
      
      const descriptionForMatching = tx.translatedDescription || tx.description;
      
      
      const specialType = detectSpecialTransactionType(descriptionForMatching);
      
      
      
      
      
      
      const type = tx.amount >= 0 ? 'income' : 'expense';
      
      
      const merchantName = extractMerchantFromDescription(descriptionForMatching);
      const normalizedMerchant = normalizeMerchantName(merchantName);
      
      let categoryId: number | null = null;
      let skipMerchantMatching = false;
      
      
      
      
      if (type === 'income' && !categoryId) {
        console.log(`[categorization] ⊘ Skipping auto-categorization for income transaction: "${tx.description.substring(0, 50)}..."`);
        
        return {
          ...tx,
          category: null,
        };
      }
      
      
      if (specialType && specialType !== 'EXCLUDE') {
        const specialCategoryId = categoryMap.get(specialType.toLowerCase());
        if (specialCategoryId) {
          categoryId = specialCategoryId;
          skipMerchantMatching = true;
          console.log(`[categorization] ✓ Special type: "${specialType}" -> categoryId: ${categoryId}`);
        }
      }
      
      
      if (!skipMerchantMatching && !categoryId) {
        
        if (userMerchantMap.has(normalizedMerchant)) {
          categoryId = userMerchantMap.get(normalizedMerchant)!;
          console.log(`[categorization] ✓ User exact: "${merchantName}" -> categoryId: ${categoryId}`);
        } else {
          
          const foundMerchant = findMerchantByBaseWords(descriptionForMatching, userMerchantPatterns);
          if (foundMerchant) {
            const foundNormalized = normalizeMerchantName(foundMerchant);
            if (userMerchantMap.has(foundNormalized)) {
              categoryId = userMerchantMap.get(foundNormalized)!;
              console.log(`[categorization] ✓ User word: "${foundMerchant}" -> categoryId: ${categoryId}`);
            }
          }
          
          
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
      
      
      if (!skipMerchantMatching && !categoryId) {
        
        if (globalMerchantMap.has(normalizedMerchant)) {
          categoryId = globalMerchantMap.get(normalizedMerchant)!;
          console.log(`[categorization] ✓ Global exact: "${merchantName}" -> categoryId: ${categoryId}`);
        } else {
          
          const foundMerchant = findMerchantByBaseWords(descriptionForMatching, globalMerchantPatterns);
          if (foundMerchant) {
            const foundNormalized = normalizeMerchantName(foundMerchant);
            if (globalMerchantMap.has(foundNormalized)) {
              categoryId = globalMerchantMap.get(foundNormalized)!;
              console.log(`[categorization] ✓ Global word: "${foundMerchant}" -> categoryId: ${categoryId}`);
            }
          }
          
          
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
      
      
      if (!categoryId && tx.category) {
        let categoryName = tx.category.toLowerCase();
        
        
        if (categoryNameMapping[categoryName]) {
          categoryName = categoryNameMapping[categoryName];
        }
        
        categoryId = categoryMap.get(categoryName) ?? null;
        if (categoryId) {
          console.log(`[categorization] ✓ Python: "${categoryName}" -> categoryId: ${categoryId}`);
        }
      }
      
      
      if (categoryId) {
        const matchedCategory = allCategories.find(c => c.id === categoryId);
        if (matchedCategory) {
          return {
            ...tx,
            category: matchedCategory.name,
          };
        }
      }
      
      
      return {
        ...tx,
        category: null,
      };
    })
    .filter((tx): tx is UploadedTransaction => tx !== null); 
  
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

    
    if (typeof progress !== 'number' && !status) {
      return NextResponse.json({ error: 'Missing progress or status' }, { status: 400 });
    }

    
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

    
    if (typeof processedCount === 'number') {
      updateData.processedCount = processedCount;
    }
    if (typeof totalCount === 'number') {
      updateData.totalCount = totalCount;
    }

    
    
    if (result !== undefined && status === 'completed') {
      
      if (result.transactions && Array.isArray(result.transactions) && result.transactions.length > 0) {
        console.log(`[job-progress] Running categorization for ${result.transactions.length} transactions`);
        
        
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

    
    await db.pdfProcessingJob.update({
      where: { id: jobId },
      data: updateData,
    });

    
    if (status === 'completed') {
      try {
        
        const job = await db.pdfProcessingJob.findUnique({
          where: { id: jobId },
          select: { userId: true, fileName: true },
        });

        if (job && (await shouldCreateNotification(job.userId, 'PDF Processing'))) {
          
          
          const now = new Date();
          
          await db.notification.create({
            data: {
              userId: job.userId,
              type: 'PDF Processing',
              text: 'Your Processed PDF is ready for review',
              date: now,
              time: now.toTimeString().split(' ')[0],
              read: false,
            },
          });
          
          console.log(`[job-progress] Created notification for completed job ${jobId}`);
        }
      } catch (notifError) {
        console.error(`[job-progress] Failed to create notification for job ${jobId}:`, notifError);
        
      }
    }

    
    if (status === 'failed') {
      try {
        const job = await db.pdfProcessingJob.findUnique({
          where: { id: jobId },
          select: { userId: true, fileName: true, error: true },
        });

        if (job && (await shouldCreateNotification(job.userId, 'PDF Processing'))) {
          const now = new Date();
          const errorMessage = job.error || 'Unknown error occurred';
          
          await db.notification.create({
            data: {
              userId: job.userId,
              type: 'PDF Processing',
              text: `PDF processing failed for "${job.fileName}": ${errorMessage}`,
              date: now,
              time: now.toTimeString().split(' ')[0],
              read: false,
            },
          });
          
          console.log(`[job-progress] Created failure notification for job ${jobId}`);
        }
      } catch (notifError) {
        console.error(`[job-progress] Failed to create failure notification for job ${jobId}:`, notifError);
        
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[job-progress] Failed to update progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

