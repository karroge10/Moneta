import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import type { LoginHistoryEntry } from '@/types/dashboard';

/** Format timestamp (ms) to date and time strings for display. */
function formatSessionTime(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return { date, time };
}

/**
 * GET /api/user/login-history
 * Returns the current user's login/session history from Clerk (sessions with createdAt, latestActivity for device/location).
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clerkClient();
    const response = await client.sessions.getSessionList({
      userId,
      limit: 50,
      offset: 0,
    });

    const sessions = (response.data ?? []).slice().sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    const entries: LoginHistoryEntry[] = sessions.map((session) => {
      const ts = session.createdAt ?? session.lastActiveAt ?? 0;
      const { date, time } = formatSessionTime(ts);

      const activity = session.latestActivity;
      const device =
        activity?.browserName || activity?.deviceType
          ? [activity.browserName, activity.deviceType].filter(Boolean).join(' on ')
          : 'Unknown device';
      const location =
        activity?.city && activity?.country
          ? `${activity.city}, ${activity.country}`
          : activity?.country ?? activity?.ipAddress ?? '—';

      return { date, time, device, location };
    });

    return NextResponse.json({ history: entries });
  } catch (error) {
    console.error('Login history fetch failed:', error);
    const message =
      error instanceof Error && process.env.NODE_ENV === 'development'
        ? error.message
        : 'Failed to load login history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
