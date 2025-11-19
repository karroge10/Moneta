import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await requireCurrentUser();
    const { jobId } = await params;

    // Delete the job (only if it belongs to the user)
    // Using deleteMany with userId check ensures user can only delete their own jobs
    const result = await (db as PrismaClient & {
      pdfProcessingJob: {
        deleteMany: (args: { where: { id: string; userId: number } }) => Promise<{ count: number }>;
      };
    }).pdfProcessingJob.deleteMany({
      where: {
        id: jobId,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[jobs/delete] error', error);
    return NextResponse.json(
      { error: 'Failed to delete job.' },
      { status: 500 },
    );
  }
}

