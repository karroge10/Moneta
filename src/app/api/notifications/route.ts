import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Fetch notifications for current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const { searchParams } = request.nextUrl;
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get('limit') ?? '10', 10)));
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const where: { userId: number; read?: boolean } = {
      userId: user.id,
    };

    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Transform to match NotificationEntry format
    const formattedNotifications = notifications.map(notif => {
      const dateObj = notif.date instanceof Date ? notif.date : new Date(notif.date);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return {
        id: notif.id.toString(),
        date: `${day}.${month}.${year}`,
        time: notif.time,
        type: notif.type,
        text: notif.text,
        read: notif.read,
      };
    });

    return NextResponse.json({
      notifications: formattedNotifications,
      total: formattedNotifications.length,
    });
  } catch (error) {
    console.error('[api/notifications] GET error', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 },
    );
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const { type, text } = body;

    if (!type || !text) {
      return NextResponse.json(
        { error: 'type and text are required' },
        { status: 400 },
      );
    }

    const now = new Date();
    const notification = await db.notification.create({
      data: {
        userId: user.id,
        type,
        text,
        date: now,
        time: now.toTimeString().split(' ')[0],
        read: false,
      },
    });

    const dateObj = notification.date instanceof Date ? notification.date : new Date(notification.date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    return NextResponse.json({
      notification: {
        id: notification.id.toString(),
        date: `${day}.${month}.${year}`,
        time: notification.time,
        type: notification.type,
        text: notification.text,
        read: notification.read,
      },
    });
  } catch (error) {
    console.error('[api/notifications] POST error', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 },
    );
  }
}

// PATCH - Mark all unread notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();

    // Mark all unread notifications for this user as read
    const result = await db.notification.updateMany({
      where: {
        userId: user.id,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({
      ok: true,
      count: result.count
    });
  } catch (error) {
    console.error('[api/notifications] PATCH error', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 },
    );
  }
}