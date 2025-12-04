import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const { searchParams } = request.nextUrl;
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') ?? '20', 10)));

    // Fetch jobs for the user (default 20, can be increased via query param)
    const jobs = await (db as PrismaClient & {
      pdfProcessingJob: {
        findMany: (args: any) => Promise<any[]>;
      };
    }).pdfProcessingJob.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        status: true,
        progress: true,
        fileName: true,
        processedCount: true,
        totalCount: true,
        createdAt: true,
        completedAt: true,
        error: true,
        result: true
      }
    });

    // Calculate processedCount from result.transactions if processedCount is null
    const jobsWithCounts = jobs.map(job => {
      if (job.status === 'completed' && (!job.processedCount || job.processedCount === 0)) {
        try {
          const result = job.result as { transactions?: unknown[] } | null;
          if (result?.transactions && Array.isArray(result.transactions)) {
            return {
              ...job,
              processedCount: result.transactions.length
            };
          }
        } catch (e) {
          // Ignore errors parsing result
        }
      }
      return job;
    });

    return NextResponse.json({
      jobs: jobsWithCounts
    });
  } catch (error) {
    console.error('[api/jobs] error', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs.' },
      { status: 500 },
    );
  }
}

