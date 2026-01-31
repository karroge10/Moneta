import { NextRequest, NextResponse } from 'next/server';
import { TransactionUploadResponse, UploadedTransaction } from '@/types/dashboard';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { shouldCreateNotification } from '@/lib/notification-settings';
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

const DEBUG_PATTERN_SET = DEBUG_PATTERNS.map(pattern => pattern.toLowerCase());

function shouldDebugTransaction(description: string): boolean {
  const lowered = description.toLowerCase();
  return DEBUG_PATTERN_SET.some(pattern => lowered.includes(pattern));
}

// Helper: Call Python service (async/background)
async function processPdfInBackground(
  file: File, 
  jobId: string, 
  callbackUrl: string,
  userId: number,
  serviceUrl: string
): Promise<void> {
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
      finalTransactions = await analyzeCategorization(finalTransactions, userId);
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

    // Create notification when job completes (only if not already created)
    if (status === 'completed') {
      try {
        const job = await db.pdfProcessingJob.findUnique({
          where: { id: jobId },
          select: { userId: true, fileName: true },
        });

        if (job && (await shouldCreateNotification(job.userId, 'PDF Processing'))) {
          // Create notification for completed job
          // No duplicate check needed - each job only completes once
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
          
          console.log(`[background-process] Created notification for completed job ${jobId}`);
        }
      } catch (notifError) {
        console.error(`[background-process] Failed to create notification for job ${jobId}:`, notifError);
      }
    }

    // Create notification when job fails
    if (status === 'failed' && error) {
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
              text: `PDF processing failed for "${job.fileName}": ${error}`,
              date: now,
              time: now.toTimeString().split(' ')[0],
              read: false,
            },
          });
          
          console.log(`[background-process] Created failure notification for job ${jobId}`);
        }
      } catch (notifError) {
        console.error(`[background-process] Failed to create failure notification for job ${jobId}:`, notifError);
      }
    }
  } catch (e) {
    console.error(`[background-process] Failed to update job ${jobId}:`, e);
  }
}

async function analyzeCategorization(transactions: UploadedTransaction[], userId: number): Promise<UploadedTransaction[]> {
  // This function matches merchants and applies categories from database
  // Similar logic to what's in import route, but simplified for upload response
  
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

  // Pre-fetch user merchants (overrides global)
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

  // Apply merchant matching to transactions
  return transactions.map((tx) => {
    // Always use translated description for checks (categories are in English)
    const descriptionForMatching = tx.translatedDescription || tx.description;
    
    // Check for special transaction types FIRST
    const specialType = detectSpecialTransactionType(descriptionForMatching);
    
    // Determine type: positive = income, negative = expense
    const type = tx.amount >= 0 ? 'income' : 'expense';
    
    let categoryId: number | null = null;
    let matchedCategoryName: string | null = null;
    let skipMerchantMatching = false;
    let matchSource: string | null = null;

    // Skip auto-categorization for income transactions (amount >= 0)
    // Income transactions should remain uncategorized unless explicitly set by user
    if (type === 'income') {
      // Keep categoryId as null (uncategorized)
      return { ...tx, category: null };
    }

    // Handle special transaction types that should be categorized (e.g., commissions → "Other")
    if (specialType && specialType !== 'EXCLUDE') {
        // Note: All transactions are saved. 'EXCLUDE' isn't returned by detectSpecialTransactionType anymore in practice,
        // but if it returns a category string (like 'other'), we map it.
        // If it returns null (for withdrawals, transfers), we leave it uncategorized.
        const specialCategoryId = categoryMap.get(specialType.toLowerCase());
        if (specialCategoryId) {
            categoryId = specialCategoryId;
            matchSource = `special:${specialType}`;
            skipMerchantMatching = true;
        }
    } else if (specialType === 'EXCLUDE') {
        // Should technically not happen given current logic, but if so, leave uncategorized
        skipMerchantMatching = true;
    }

    // Extract merchant name
    const merchantName = extractMerchantFromDescription(descriptionForMatching);
    const normalizedMerchant = normalizeMerchantName(merchantName);
    
    if (!categoryId && !skipMerchantMatching) {
        // 1. User Override
        if (userMerchantMap.has(normalizedMerchant)) {
            categoryId = userMerchantMap.get(normalizedMerchant)!;
            matchSource = 'user-exact';
        } else {
            // User word match
            const foundUserMerchant = findMerchantByBaseWords(descriptionForMatching, userMerchantPatterns);
            if (foundUserMerchant) {
                const norm = normalizeMerchantName(foundUserMerchant);
                if (userMerchantMap.has(norm)) {
                    categoryId = userMerchantMap.get(norm)!;
                    matchSource = 'user-word';
                }
            }
        }

        // 2. Global Merchant
        if (!categoryId) {
            if (globalMerchantMap.has(normalizedMerchant)) {
                categoryId = globalMerchantMap.get(normalizedMerchant)!;
                matchSource = 'global-exact';
            } else {
                // Global word match
                const foundGlobalMerchant = findMerchantByBaseWords(descriptionForMatching, globalMerchantPatterns);
                if (foundGlobalMerchant) {
                    const norm = normalizeMerchantName(foundGlobalMerchant);
                    if (globalMerchantMap.has(norm)) {
                        categoryId = globalMerchantMap.get(norm)!;
                        matchSource = 'global-word';
                    }
                }
            }
        }

        // 3. Fuzzy Match (Fallback)
        if (!categoryId) {
            // Check user merchants fuzzy
            for (const [pattern, catId] of userMerchantMap.entries()) {
                const similarity = fuzzyMatch(normalizedMerchant, pattern);
                if (similarity > 0.85) {
                    categoryId = catId;
                    matchSource = `user-fuzzy:${similarity.toFixed(2)}`;
                    break;
                }
            }
            // Check global merchants fuzzy
            if (!categoryId) {
                for (const [pattern, catId] of globalMerchantMap.entries()) {
                    const similarity = fuzzyMatch(normalizedMerchant, pattern);
                    if (similarity > 0.85) {
                        categoryId = catId;
                        matchSource = `global-fuzzy:${similarity.toFixed(2)}`;
                        break;
                    }
                }
            }
        }
    }
    
    // If matched, update category
    if (categoryId) {
      const matchedCategory = allCategories.find(c => c.id === categoryId);
      if (matchedCategory) {
        if (shouldDebugTransaction(tx.description)) {
          console.log('[upload-debug]', {
            description: tx.description,
            type,
            specialType,
            merchantName,
            normalizedMerchant,
            category: matchedCategory.name,
            matchSource,
          });
        }
        return {
          ...tx,
          category: matchedCategory.name,
        };
      }
    }

    if (shouldDebugTransaction(tx.description)) {
      console.log('[upload-debug]', {
        description: tx.description,
        type,
        specialType,
        merchantName,
        normalizedMerchant,
        category: null,
        matchSource,
      });
    }
    
    // If no match, return with null category (ensure we don't pass through hallucinated category strings from Python if any remain)
    return {
        ...tx,
        category: null
    };
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
    const serviceUrl = process.env.PYTHON_SERVICE_URL;

    const job = await db.pdfProcessingJob.create({
      data: {
        userId: user.id,
        status: serviceUrl ? 'processing' : 'queued',
        progress: 0,
        fileName: fileName,
        fileContent: fileContentBuffer
      },
      select: { id: true, fileName: true, createdAt: true }
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
    let callbackUrl = `${appUrl}/api/internal/jobs/${jobId}/progress`;

    const callbackHostOverride = process.env.PYTHON_SERVICE_CALLBACK_HOST;
    if (callbackHostOverride) {
      try {
        const callbackUrlObj = new URL(callbackUrl);
        callbackUrlObj.hostname = callbackHostOverride;
        callbackUrl = callbackUrlObj.toString();
      } catch (err) {
        console.error('[background-process] Invalid PYTHON_SERVICE_CALLBACK_HOST value:', err);
      }
    }
    
    if (serviceUrl) {
      // Mark job as processing so background workers do not pick it up
      await updateJobStatus(jobId, 'processing', 0);
      // Don't await this! Let it run in background
      processPdfInBackground(file, jobId, callbackUrl, user.id, serviceUrl);
    }

    // 4. Return Immediate Response
    return NextResponse.json({
      jobId,
      fileName,
      status: serviceUrl ? 'processing' : 'queued',
      progress: 0,
      queuePosition,
      createdAt: job.createdAt.toISOString(),
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
