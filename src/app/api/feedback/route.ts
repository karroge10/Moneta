import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = ['Bug Report', 'Feature Request', 'Other'] as const;

/**
 * POST /api/feedback
 * Saves feedback to the database. Auth optional; if authenticated, userId is set.
 * No email is sent; data is stored only in DB.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!ALLOWED_CATEGORIES.includes(category as (typeof ALLOWED_CATEGORIES)[number])) {
      return NextResponse.json(
        { error: `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const user = await getCurrentUser();

    await db.feedback.create({
      data: {
        userId: user?.id ?? null,
        email,
        category,
        message,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Feedback POST error:', err);
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    );
  }
}
