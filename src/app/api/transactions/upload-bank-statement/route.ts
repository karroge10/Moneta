import { NextRequest, NextResponse } from 'next/server';
import { TransactionUploadResponse, UploadedTransaction } from '@/types/dashboard';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeMerchantName, extractMerchantFromDescription, fuzzyMatch } from '@/lib/merchant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function callPythonService(file: File): Promise<TransactionUploadResponse> {
  const serviceUrl = process.env.PYTHON_SERVICE_URL;
  
  if (!serviceUrl) {
    throw new Error('PYTHON_SERVICE_URL environment variable is not set');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${serviceUrl}/process-pdf`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Service returned status ${response.status}`);
  }

  return response.json() as Promise<TransactionUploadResponse>;
}

async function analyzeCategorization(transactions: UploadedTransaction[]): Promise<UploadedTransaction[]> {
  // This function matches merchants and applies categories from database
  // Similar logic to what's in import route, but simplified for upload response
  
  // Pre-fetch categories and merchants (simplified - could be optimized with caching)
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
    
    // Check user merchants first (if we had user context, but for now just use global)
    // In production, you'd pass user context here
    
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

export async function POST(request: NextRequest) {
  let processingRequestId: string | null = null;
  let estimatedQueuePosition = 0;
  
  try {
    const user = await requireCurrentUser();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
    }

    // Track this processing request in database for queue estimation
    const requestStartTime = Date.now();
    const fileArrayBuffer = await (file as File).arrayBuffer();
    const fileContentBuffer = Buffer.from(fileArrayBuffer);

    try {
      // Use raw SQL to create tracking entry (works even if Prisma client not regenerated)
      const trackingResult = await db.$queryRaw<Array<{ id: string; createdAt: Date }>>`
        INSERT INTO "PdfProcessingJob" ("id", "userId", "status", "progress", "fileContent", "fileName", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${user.id}, 'processing', 0, ${fileContentBuffer}, ${file.name}, NOW(), NOW())
        RETURNING "id", "createdAt"
      `;
      
      if (trackingResult && trackingResult.length > 0) {
        processingRequestId = trackingResult[0].id;
        const createdAt = trackingResult[0].createdAt;
        
        // Get queue position (how many requests started before this one)
        const queueResult = await db.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint as count
          FROM "PdfProcessingJob"
          WHERE status = 'processing'
            AND "createdAt" < ${createdAt}
        `;
        
        const earlierJobs = queueResult && queueResult.length > 0 ? Number(queueResult[0].count) : 0;
        
        // Estimate: if more than 4 are processing, some are queued (4 = max concurrent)
        // -3 because current request + 3 others can process simultaneously
        estimatedQueuePosition = Math.max(0, earlierJobs - 3);
        
        console.log(`[upload-bank-statement] Created tracking entry ${processingRequestId}, queue position: ${estimatedQueuePosition}`);
      }
    } catch (trackingError) {
      console.error('[upload-bank-statement] Failed to create tracking entry:', trackingError);
      // Continue anyway - tracking is optional
      estimatedQueuePosition = 0;
    }

    try {
      // Call external Python service (Render)
      const result = await callPythonService(file as File);
      
      // Mark tracking entry as completed (don't delete - let it persist for visibility)
      if (processingRequestId) {
        try {
          await db.$executeRaw`
            UPDATE "PdfProcessingJob"
            SET status = 'completed', progress = 100, "completedAt" = NOW(), "updatedAt" = NOW()
            WHERE id = ${processingRequestId}
          `;
          console.log(`[upload-bank-statement] Marked tracking entry ${processingRequestId} as completed`);
        } catch (cleanupError) {
          console.warn('[upload-bank-statement] Failed to update tracking entry:', cleanupError);
        }
      }

    // Check if we got sample data (indicates PDF extraction failed)
        if (result.transactions && result.transactions.length === 3) {
          const sampleDescriptions = ['Sample Subscription', 'Coffee Shop', 'Salary'];
          const isSampleData = result.transactions.every(tx => 
            sampleDescriptions.some(sample => tx.description.includes(sample))
          );
          
          if (isSampleData) {
            console.error('[upload-bank-statement] PDF extraction failed - received sample data');
            return NextResponse.json(
              { 
              error: 'Failed to extract transactions from PDF. The PDF structure may not match the expected format.',
                transactions: [],
                metadata: result.metadata || {},
              },
              { status: 400 }
            );
          }
        }
        
        // Analyze categorization after parsing and apply matched categories
        if (result.transactions && result.transactions.length > 0) {
          const updatedTransactions = await analyzeCategorization(result.transactions);
          result.transactions = updatedTransactions;
        }
        
      const processingTimeMs = Date.now() - requestStartTime;
      
      return NextResponse.json({
        ...result,
        queuePosition: estimatedQueuePosition, // Initial queue position when request started
        processingTimeMs, // Include processing time for frontend estimation
      });
    } catch (error) {
      // Mark tracking entry as failed on error
      if (processingRequestId) {
        try {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await db.$executeRaw`
            UPDATE "PdfProcessingJob"
            SET status = 'failed', error = ${errorMessage}, "updatedAt" = NOW()
            WHERE id = ${processingRequestId}
          `;
          console.log(`[upload-bank-statement] Marked tracking entry ${processingRequestId} as failed: ${errorMessage}`);
        } catch (cleanupError) {
          console.warn('[upload-bank-statement] Failed to update tracking entry:', cleanupError);
        }
      }
      
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('[upload-bank-statement] error', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process bank statement. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}
