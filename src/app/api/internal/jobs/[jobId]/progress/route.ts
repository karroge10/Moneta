import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const body = await request.json();
    const { progress, status, processedCount, totalCount } = body;

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

