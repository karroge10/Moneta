import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get internal user ID from DB
    const dbUser = await db.user.findUnique({
      where: { clerkUserId: user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Fetch all transactions for this user
    const transactions = await db.transaction.findMany({
      where: { userId: dbUser.id },
      include: {
        category: { select: { name: true } },
        currency: { select: { alias: true } },
      },
      orderBy: { date: 'desc' },
    });

    // We return JSON, the client will convert it to CSV to avoid server-side complexity with CSV libraries
    // and to handle the download more elegantly in the browser.
    return NextResponse.json({
      success: true,
      data: transactions.map(t => ({
        Date: new Date(t.date).toLocaleDateString(),
        Name: t.description || 'Transaction',
        Amount: t.amount,
        Currency: t.currency.alias,
        Type: t.type,
        Category: t.category?.name || 'Uncategorized',
        Description: t.description || '',
      })),
    });
  } catch (error) {
    console.error('[EXPORT_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
