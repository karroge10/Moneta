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
    
    console.log(`[upload-bank-statement] File size: ${fileBuffer.length} bytes, name: ${file.name}`);

    // Create job in database with file content stored directly
    // Type assertion needed until Prisma client is regenerated to include PdfProcessingJob model
    try {
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
    } catch (dbError) {
      console.error('[upload-bank-statement] Database error:', dbError);
      throw dbError; // Re-throw to be caught by outer catch
    }
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


