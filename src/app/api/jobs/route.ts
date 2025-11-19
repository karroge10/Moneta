import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();

    // Fetch last 5 jobs for the user
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
      take: 5,
      select: {
        id: true,
        status: true,
        progress: true,
        fileName: true,
        processedCount: true,
        totalCount: true,
        createdAt: true,
        completedAt: true,
        error: true
      }
    });

    return NextResponse.json({
      jobs
    });
  } catch (error) {
    console.error('[api/jobs] error', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs.' },
      { status: 500 },
    );
  }
}

