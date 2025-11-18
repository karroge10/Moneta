import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const user = await requireCurrentUser();
    const jobId = params.jobId;

    const job = await db.pdfProcessingJob.findFirst({
      where: {
        id: jobId,
        userId: user.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Extract transactions from result JSON if available
    const result = job.result as { transactions?: any[]; metadata?: any } | null;
    
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

