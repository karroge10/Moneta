import { NextRequest, NextResponse } from 'next/server';
import { TransactionUploadResponse, UploadedTransaction } from '@/types/dashboard';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeMerchantName, extractMerchantFromDescription, fuzzyMatch } from '@/lib/merchant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper: Call Python service (async/background)
async function processPdfInBackground(
  file: File, 
  jobId: string, 
  callbackUrl: string
): Promise<void> {
  const serviceUrl = process.env.PYTHON_SERVICE_URL;
  
  if (!serviceUrl) {
    console.error('[background-process] PYTHON_SERVICE_URL environment variable is not set');
    await updateJobStatus(jobId, 'failed', 0, undefined, 'Configuration error: Service URL missing');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobId', jobId);
    formData.append('callbackUrl', callbackUrl);

    const response = await fetch(`${serviceUrl}/process-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Service returned status ${response.status}`);
    }

    const result = await response.json() as TransactionUploadResponse;
    
    // Check for sample data (failure)
    if (result.transactions && result.transactions.length === 3) {
      const sampleDescriptions = ['Sample Subscription', 'Coffee Shop', 'Salary'];
      const isSampleData = result.transactions.every(tx => 
        sampleDescriptions.some(sample => tx.description.includes(sample))
      );
      
      if (isSampleData) {
        await updateJobStatus(jobId, 'failed', 0, undefined, 'Failed to extract transactions from PDF. Structure mismatch.');
        return;
      }
    }

    // Analyze & Categorize
    let finalTransactions = result.transactions || [];
    if (finalTransactions.length > 0) {
      finalTransactions = await analyzeCategorization(finalTransactions);
    }

    // Mark complete
    await updateJobStatus(jobId, 'completed', 100, {
      transactions: finalTransactions,
      metadata: result.metadata
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[background-process] Job ${jobId} failed:`, error);
    await updateJobStatus(jobId, 'failed', 0, undefined, msg);
  }
}

// Helper: Update job status in DB
async function updateJobStatus(
  jobId: string, 
  status: string, 
  progress?: number, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any, 
  error?: string
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { status, updatedAt: new Date() };
    if (progress !== undefined) data.progress = progress;
    if (result !== undefined) data.result = result;
    if (error !== undefined) data.error = error;
    if (status === 'completed') data.completedAt = new Date();

    await db.pdfProcessingJob.update({
      where: { id: jobId },
      data
    });
  } catch (e) {
    console.error(`[background-process] Failed to update job ${jobId}:`, e);
  }
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
  try {
    const user = await requireCurrentUser();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
    }

    // 1. Create Job Entry Immediately
    const fileArrayBuffer = await file.arrayBuffer();
    const fileContentBuffer = Buffer.from(fileArrayBuffer);
    const fileName = file.name;

    // Use Prisma (or raw if preferred) to create initial job
    // Switching to Prisma for cleaner syntax, but ensuring buffer is handled
    const job = await db.pdfProcessingJob.create({
      data: {
        userId: user.id,
        status: 'queued',
        progress: 0,
        fileName: fileName,
        fileContent: fileContentBuffer
      },
      select: { id: true, createdAt: true }
    });

    const jobId = job.id;

    // 2. Calculate Queue Position (Fix for completed/failed exclusion)
    // Count active jobs created before this one
    const earlierJobsCount = await db.pdfProcessingJob.count({
      where: {
        status: { in: ['queued', 'processing'] },
        createdAt: { lt: job.createdAt }
      }
    });
    
    // Assuming 1 concurrent worker limit for now
    const queuePosition = Math.max(0, earlierJobsCount);

    // 3. Trigger Background Processing (Fire & Forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const callbackUrl = `${appUrl}/api/internal/jobs/${jobId}/progress`;
    
    // Don't await this! Let it run in background
    processPdfInBackground(file, jobId, callbackUrl);

    // 4. Return Immediate Response
    return NextResponse.json({
      jobId,
      status: 'queued',
      progress: 0,
      queuePosition,
      message: 'Upload accepted. Processing in background.'
    });

  } catch (error) {
    console.error('[upload-bank-statement] error', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: 'Failed to initiate processing.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}
