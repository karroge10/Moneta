import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireCurrentUser();
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    
    const job = await db.pdfProcessingJob.findUnique({
      where: { 
        id: jobId,
        userId: user.id 
      },
      select: {
        id: true,
        status: true,
        progress: true,
        processedCount: true,
        totalCount: true,
        result: true,
        error: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true
      }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    
    let queuePosition = 0;
    if (job.status === 'queued' || job.status === 'processing') {
      
      
      const earlierJobsCount = await db.pdfProcessingJob.count({
        where: {
          status: { in: ['queued', 'processing'] },
          createdAt: { lt: job.createdAt }
        }
      });
      
      
      
      
      queuePosition = earlierJobsCount;
    }

    return NextResponse.json({
      status: job.status,
      progress: job.progress,
      processedCount: job.processedCount,
      totalCount: job.totalCount,
      queuePosition,
      
      result: job.status === 'completed' ? job.result : undefined,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
  } catch (error) {
    console.error('[job-status] Error fetching status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}

