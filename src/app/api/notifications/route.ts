import { NextRequest, NextResponse } from 'next/server';
import { formatDate } from '@/lib/format';
import { requireCurrentUser } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const { searchParams } = request.nextUrl;
    
    
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? '10', 10)));
    const skip = (page - 1) * pageSize;
    
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const where: { userId: number; read?: boolean } = {
      userId: user.id,
    };

    if (unreadOnly) {
      where.read = false;
    }

    
    const totalCount = await db.notification.count({ where });

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    
    const formattedNotifications = notifications.map(notif => {
      const dateObj = notif.date instanceof Date ? notif.date : new Date(notif.date);
      const displayDate = formatDate(dateObj, 'ordinal');
      return {
        id: notif.id.toString(),
        date: displayDate,
        time: notif.time,
        type: notif.type,
        text: notif.text,
        read: notif.read,
      };
    });

    return NextResponse.json({
      notifications: formattedNotifications,
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error) {
    return errorResponse(error, '[api/notifications] GET error', 'Failed to fetch notifications');
  }
}


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
    const displayDate = formatDate(dateObj, 'ordinal');

    return NextResponse.json({
      notification: {
        id: notification.id.toString(),
        date: displayDate,
        time: notification.time,
        type: notification.type,
        text: notification.text,
        read: notification.read,
      },
    });
  } catch (error) {
    return errorResponse(error, '[api/notifications] POST error', 'Failed to create notification');
  }
}


export async function PATCH(_request: NextRequest) {
  try {
    const user = await requireCurrentUser();

    
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
    return errorResponse(error, '[api/notifications] PATCH error', 'Failed to mark notifications as read');
  }
}