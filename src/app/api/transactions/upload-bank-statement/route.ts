import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

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
    
    console.log(`[upload-bank-statement] File size: ${fileBuffer.length} bytes, name: ${file.name}`);

    // Create job in database with file content stored directly
    // Use raw SQL as fallback since Prisma client might not be regenerated on Vercel yet
    let jobId: string;
    
    try {
      // Try Prisma client first (if regenerated)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaClient = db as any;
      if (prismaClient.pdfProcessingJob) {
        const job = await prismaClient.pdfProcessingJob.create({
          data: {
            userId: user.id,
            status: 'queued',
            progress: 0,
            fileContent: fileBuffer,
            fileName: file.name,
          },
        });
        jobId = job.id;
      } else {
        // Fallback to raw SQL if Prisma client not regenerated
        throw new Error('Prisma client not regenerated, using raw SQL');
      }
    } catch {
      // Fallback to raw SQL query using Prisma's unsafe method for binary data
      console.log('[upload-bank-statement] Using raw SQL fallback');
      
      // Use $queryRawUnsafe to insert with RETURNING
      const insertedJob = await db.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "PdfProcessingJob" ("id", "userId", "status", "progress", "fileContent", "fileName", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'queued', 0, $2::bytea, $3, NOW(), NOW())
         RETURNING "id"`,
        user.id,
        fileBuffer,
        file.name
      );
      
      if (!insertedJob || insertedJob.length === 0) {
        throw new Error('Failed to create job in database');
      }
      
      jobId = insertedJob[0].id;
    }
    
    console.log(`[upload-bank-statement] Created job ${jobId} for user ${user.id}`);
    
    // Return immediately with job ID (don't wait for processing)
    return NextResponse.json({
      jobId,
      status: 'queued',
    });
  } catch (error) {
    console.error('[upload-bank-statement] error', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[upload-bank-statement] Error details:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : 'Unknown',
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to upload bank statement. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 },
    );
  }
}


