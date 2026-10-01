import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const notificationId = Number.parseInt(id, 10);

    if (Number.isNaN(notificationId)) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 },
      );
    }

    
    const notification = await db.notification.findFirst({
      where: {
        id: notificationId,
        userId: user.id,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 },
      );
    }

    
    await db.notification.update({
      where: { id: notificationId, userId: user.id },
      data: { read: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, 'api/notifications/[id]/read] PATCH error', 'Failed to mark notification as read');
  }
}

