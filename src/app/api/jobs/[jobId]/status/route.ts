import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { UploadedTransaction } from '@/types/dashboard';
import type { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireCurrentUser();
    const { jobId } = await params;

    // Type assertion needed until Prisma client is regenerated to include PdfProcessingJob model
    const job = await (db as PrismaClient & {
      pdfProcessingJob: {
        findFirst: (args: { where: { id: string; userId: number } }) => Promise<{
          id: string;
          status: string;
          progress: number;
          result: unknown;
          error: string | null;
        } | null>;
      };
    }).pdfProcessingJob.findFirst({
      where: {
        id: jobId,
        userId: user.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Extract transactions from result JSON if available
    const result = job.result as { transactions?: UploadedTransaction[]; metadata?: { currency?: string; source?: string; periodStart?: string; periodEnd?: string } } | null;
    
    return NextResponse.json({
      status: job.status,
      progress: job.progress,
      transactions: result?.transactions || null,
      metadata: result?.metadata || null,
      error: job.error,
    });
  } catch (error) {
    console.error('[jobs/status] error', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status.' },
      { status: 500 },
    );
  }
}

