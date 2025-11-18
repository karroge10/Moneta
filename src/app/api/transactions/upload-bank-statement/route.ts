import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Processing now happens in background worker - see python-service/worker.py

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
    }

    // Read file content into buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Create job in database with file content stored directly
    // Type assertion needed until Prisma client is regenerated to include PdfProcessingJob model
    const job = await (db as PrismaClient & {
      pdfProcessingJob: {
        create: (args: {
          data: {
            userId: number;
            status: string;
            progress: number;
            fileContent: Buffer;
            fileName: string;
          };
        }) => Promise<{
          id: string;
          status: string;
          progress: number;
        }>;
      };
    }).pdfProcessingJob.create({
      data: {
        userId: user.id,
        status: 'queued',
        progress: 0,
        fileContent: fileBuffer,
        fileName: file.name,
      },
    });

    console.log(`[upload-bank-statement] Created job ${job.id} for user ${user.id}`);

    // Return immediately with job ID (don't wait for processing)
    return NextResponse.json({
      jobId: job.id,
      status: 'queued',
    });
  } catch (error) {
    console.error('[upload-bank-statement] error', error);
    return NextResponse.json(
      { error: 'Failed to upload bank statement. Please try again.' },
      { status: 500 },
    );
  }
}


