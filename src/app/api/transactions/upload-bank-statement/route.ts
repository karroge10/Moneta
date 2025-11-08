import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import os from 'node:os';
import { TransactionUploadResponse } from '@/types/dashboard';

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

function getPythonExecutable() {
  if (process.env.PYTHON_PATH) {
    return process.env.PYTHON_PATH;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

async function runPythonPipeline(pdfPath: string) {
  const pythonExec = getPythonExecutable();
  const scriptPath = path.join(process.cwd(), 'python', 'process_pdf.py');
  const modelPath =
    process.env.CATEGORIES_MODEL_PATH ||
    path.join(process.cwd(), 'python', 'models', 'categories.ftz');

  return new Promise<TransactionUploadResponse>((resolve, reject) => {
    const child = spawn(pythonExec, [scriptPath, pdfPath, modelPath], {
      env: {
        ...process.env,
        TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('error', error => {
      reject(error);
    });

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr || `Python process exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as TransactionUploadResponse;
        resolve(parsed);
      } catch (error) {
        reject(new Error(`Failed to parse worker output: ${(error as Error).message}`));
      }
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
    }

    const tempFilePath = await saveTempFile(file);

    try {
      const result = await runPythonPipeline(tempFilePath);
      return NextResponse.json(result);
    } finally {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  } catch (error) {
    console.error('[upload-bank-statement] error', error);
    return NextResponse.json(
      { error: 'Failed to process bank statement. Please try again.' },
      { status: 500 },
    );
  }
}


