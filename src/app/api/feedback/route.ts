import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = ['Bug Report', 'Feature Request', 'Other'] as const;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// This endpoint is public, so submissions are rate limited per IP. The counter lives in memory,
// which means each server instance keeps its own limit and it resets on cold start.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const submissionsByIp = new Map<string, number[]>();


export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 });
    }

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Email is invalid' }, { status: 400 });
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
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400 }
      );
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
    return errorResponse(err, 'Feedback POST error', 'Failed to save feedback');
  }
}


function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for') ?? '';
  const firstForwarded = forwardedFor.split(',')[0].trim();
  return firstForwarded || 'unknown';
}

/** Records this submission and reports whether the IP is over the limit for the current window. */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const previous = submissionsByIp.get(ip) ?? [];
  const recent = previous.filter((timestamp) => timestamp > windowStart);

  if (recent.length >= RATE_LIMIT_MAX) {
    submissionsByIp.set(ip, recent);
    return true;
  }

  recent.push(now);
  submissionsByIp.set(ip, recent);
  pruneExpiredEntries(windowStart);
  return false;
}

/** Drops IPs with no submissions in the window so the map does not grow without bound. */
function pruneExpiredEntries(windowStart: number) {
  for (const [ip, timestamps] of submissionsByIp) {
    const lastTimestamp = timestamps[timestamps.length - 1];
    if (lastTimestamp <= windowStart) {
      submissionsByIp.delete(ip);
    }
  }
}
