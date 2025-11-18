import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ensureDirectory(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function saveTempFile(file: File) {
  const uploadRoot = path.join(process.cwd(), 'tmp', 'uploads');
  await ensureDirectory(uploadRoot);

  const uniqueName = `${Date.now()}-${randomUUID()}.pdf`;
  const filePath = path.join(uploadRoot, uniqueName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return filePath;
}

// Processing now happens in background worker - see python-service/worker.py

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
    }

    // Save file temporarily
    const tempFilePath = await saveTempFile(file as File);

    // Create job in database
    const job = await db.pdfProcessingJob.create({
      data: {
        userId: user.id,
        status: 'queued',
        progress: 0,
        filePath: tempFilePath,
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


