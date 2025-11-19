import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeMerchantName, extractMerchantFromDescription, fuzzyMatch } from '@/lib/merchant';
import { UploadedTransaction } from '@/types/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function analyzeCategorization(transactions: UploadedTransaction[]): Promise<UploadedTransaction[]> {
  // This function matches merchants and applies categories from database
  
  // Pre-fetch categories and merchants
  const allCategories = await db.category.findMany();
  const categoryMap = new Map<string, number>();
  allCategories.forEach((cat: { name: string; id: number }) => {
    categoryMap.set(cat.name.toLowerCase(), cat.id);
  });

  const globalMerchants = await db.merchantGlobal.findMany();
  const globalMerchantMap = new Map<string, number>();
  globalMerchants.forEach((merchant: { namePattern: string; categoryId: number }) => {
    const normalizedPattern = normalizeMerchantName(merchant.namePattern);
    globalMerchantMap.set(normalizedPattern, merchant.categoryId);
  });

  // Apply merchant matching to transactions
  return transactions.map((tx) => {
    const description = tx.description || '';
    const merchantName = extractMerchantFromDescription(description);
    const normalizedMerchant = normalizeMerchantName(merchantName);
    
    // Try to match merchant
    let matchedCategoryId: number | null = null;
    
    if (normalizedMerchant) {
      // Check global merchants
      if (globalMerchantMap.has(normalizedMerchant)) {
        matchedCategoryId = globalMerchantMap.get(normalizedMerchant)!;
      } else {
        // Try fuzzy matching
        for (const [pattern, categoryId] of globalMerchantMap.entries()) {
          const similarity = fuzzyMatch(normalizedMerchant, pattern);
          if (similarity > 0.7) {
            matchedCategoryId = categoryId;
            break;
          }
        }
      }
    }
    
    // If matched, update category
    if (matchedCategoryId) {
      const matchedCategory = allCategories.find(c => c.id === matchedCategoryId);
      if (matchedCategory) {
        return {
          ...tx,
          category: matchedCategory.name,
        };
      }
    }
    
    return tx;
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
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
        result.transactions = await analyzeCategorization(result.transactions);
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

