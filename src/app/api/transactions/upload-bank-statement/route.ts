import { NextRequest, NextResponse, after } from 'next/server';
import { TransactionUploadResponse, UploadedTransaction } from '@/types/dashboard';
import { requireCurrentUser } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { checkPdfImportAllowed } from '@/lib/billing/entitlements';
import { fillMissingTranslations } from '@/lib/statement-translation';
import { db } from '@/lib/db';
import { JobStatus, Prisma } from '@prisma/client';
import { shouldCreateNotification } from '@/lib/notification-settings';
import { normalizeMerchantName, extractMerchantFromDescription, fuzzyMatch, findMerchantByBaseWords, detectSpecialTransactionType } from '@/lib/merchant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const PDF_MAGIC = '%PDF';


export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();

    const importAllowance = await checkPdfImportAllowed(user.id);
    if (!importAllowance.allowed) {
      return NextResponse.json(
        {
          error: `Free plan includes ${importAllowance.limit} PDF imports per month. Upgrade to Premium in Settings for unlimited imports.`,
          code: 'PDF_IMPORT_LIMIT',
        },
        { status: 402 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'The file is larger than 10 MB.' }, { status: 413 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
    }

    const fileArrayBuffer = await file.arrayBuffer();
    const fileContentBuffer = Buffer.from(fileArrayBuffer);
    const fileHeader = fileContentBuffer.subarray(0, PDF_MAGIC.length).toString('latin1');
    if (fileHeader !== PDF_MAGIC) {
      return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
    }
    const fileName = file.name;

    
    
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

    
    
    const earlierJobsCount = await db.pdfProcessingJob.count({
      where: {
        status: { in: ['queued', 'processing'] },
        createdAt: { lt: job.createdAt }
      }
    });
    
    
    const queuePosition = Math.max(0, earlierJobsCount);

    
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
      
      await updateJobStatus(jobId, 'processing', 0);
      
      // after() keeps the function alive once the response is sent; a bare promise can be frozen
      // by the platform. The Python service's progress callbacks still deliver the result if not.
      after(() => processPdfInBackground(file, jobId, callbackUrl, user.id, serviceUrl));
    }

    
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
    return errorResponse(error, '[upload-bank-statement] error', 'Failed to initiate processing.');
  }
}


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
      headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '' },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Service returned status ${response.status}`);
    }

    const result = await response.json() as TransactionUploadResponse;
    
    

    
    let finalTransactions = result.transactions || [];
    if (finalTransactions.length > 0) {
      const translated = await fillMissingTranslations(userId, finalTransactions);
      finalTransactions = await analyzeCategorization(translated, userId);
    }

    
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


async function updateJobStatus(
  jobId: string, 
  status: JobStatus, 
  progress?: number, 
  
  result?: unknown, 
  error?: string
) {
  try {
    
    const data: Prisma.PdfProcessingJobUpdateInput = { status, updatedAt: new Date() };
    if (progress !== undefined) data.progress = progress;
    if (result !== undefined) {
      data.result = result === null ? Prisma.JsonNull : (result as Prisma.InputJsonValue);
    }
    if (error !== undefined) data.error = error;
    if (status === 'completed') data.completedAt = new Date();

    await db.pdfProcessingJob.update({
      where: { id: jobId },
      data
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
          
          console.log(`[background-process] Created notification for completed job ${jobId}`);
        }
      } catch (notifError) {
        console.error(`[background-process] Failed to create notification for job ${jobId}:`, notifError);
      }
    }

    
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

  
  return transactions.map((tx) => {
    
    const descriptionForMatching = tx.translatedDescription || tx.description;
    
    
    const specialType = detectSpecialTransactionType(descriptionForMatching);
    
    
    const type = tx.amount >= 0 ? 'income' : 'expense';
    
    let categoryId: number | null = null;
    let skipMerchantMatching = false;

    
    
    if (type === 'income') {
      
      return { ...tx, category: null };
    }

    
    if (specialType && specialType !== 'EXCLUDE') {
        
        
        
        const specialCategoryId = categoryMap.get(specialType.toLowerCase());
        if (specialCategoryId) {
            categoryId = specialCategoryId;
            skipMerchantMatching = true;
        }
    } else if (specialType === 'EXCLUDE') {
        
        skipMerchantMatching = true;
    }

    
    const merchantName = extractMerchantFromDescription(descriptionForMatching);
    const normalizedMerchant = normalizeMerchantName(merchantName);
    
    if (!categoryId && !skipMerchantMatching) {
        
        if (userMerchantMap.has(normalizedMerchant)) {
            categoryId = userMerchantMap.get(normalizedMerchant)!;
        } else {
            
            const foundUserMerchant = findMerchantByBaseWords(descriptionForMatching, userMerchantPatterns);
            if (foundUserMerchant) {
                const norm = normalizeMerchantName(foundUserMerchant);
                if (userMerchantMap.has(norm)) {
                    categoryId = userMerchantMap.get(norm)!;
                }
            }
        }

        
        if (!categoryId) {
            if (globalMerchantMap.has(normalizedMerchant)) {
                categoryId = globalMerchantMap.get(normalizedMerchant)!;
            } else {
                
                const foundGlobalMerchant = findMerchantByBaseWords(descriptionForMatching, globalMerchantPatterns);
                if (foundGlobalMerchant) {
                    const norm = normalizeMerchantName(foundGlobalMerchant);
                    if (globalMerchantMap.has(norm)) {
                        categoryId = globalMerchantMap.get(norm)!;
                    }
                }
            }
        }

        
        if (!categoryId) {
            
            for (const [pattern, catId] of userMerchantMap.entries()) {
                const similarity = fuzzyMatch(normalizedMerchant, pattern);
                if (similarity > 0.85) {
                    categoryId = catId;
                    break;
                }
            }
            
            if (!categoryId) {
                for (const [pattern, catId] of globalMerchantMap.entries()) {
                    const similarity = fuzzyMatch(normalizedMerchant, pattern);
                    if (similarity > 0.85) {
                        categoryId = catId;
                        break;
                    }
                }
            }
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
        category: null
    };
  });
}
