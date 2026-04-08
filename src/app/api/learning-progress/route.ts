import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { learningLessonIdSet } from '@/lib/learningCenterLessons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const rows = await db.learningLessonProgress.findMany({
      where: { userId: user.id },
      select: { lessonId: true },
    });
    return NextResponse.json({ completedLessonIds: rows.map((r) => r.lessonId) });
  } catch (e) {
    console.error('[learning-progress GET]', e);
    return NextResponse.json({ error: 'Unauthorized or failed to load progress' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const lessonId =
      typeof body === 'object' && body !== null && 'lessonId' in body && typeof (body as { lessonId: unknown }).lessonId === 'string'
        ? (body as { lessonId: string }).lessonId.trim()
        : null;
    if (!lessonId || !learningLessonIdSet.has(lessonId)) {
      return NextResponse.json({ error: 'Invalid lessonId' }, { status: 400 });
    }

    await db.learningLessonProgress.upsert({
      where: {
        userId_lessonId: { userId: user.id, lessonId },
      },
      create: { userId: user.id, lessonId },
      update: { updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, lessonId });
  } catch (e) {
    console.error('[learning-progress POST]', e);
    return NextResponse.json({ error: 'Unauthorized or failed to save' }, { status: 401 });
  }
}
