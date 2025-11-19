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

    // Fetch job details
    const job = await db.pdfProcessingJob.findUnique({
      where: { 
        id: jobId,
        userId: user.id // Ensure user owns the job
      },
      select: {
        id: true,
        status: true,
        progress: true,
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

    // Calculate queue position if still queued/processing
    let queuePosition = 0;
    if (job.status === 'queued' || job.status === 'processing') {
      // Count how many incomplete jobs were created before this one
      // We filter out completed/failed jobs to not inflate the queue
      const earlierJobsCount = await db.pdfProcessingJob.count({
        where: {
          status: { in: ['queued', 'processing'] },
          createdAt: { lt: job.createdAt }
        }
      });
      
      // Assuming 1 concurrent worker (Python service on Render)
      // The job at index 0 is being processed, index 1 is 1st in queue, etc.
      // But simplified: just show how many are ahead
      queuePosition = earlierJobsCount;
    }

    return NextResponse.json({
      status: job.status,
      progress: job.progress,
      queuePosition,
      // Only return result when completed to save bandwidth
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

