import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * DELETE /api/user/account
 * Permanently delete the current user: Clerk user first, then DB user (cascade clears related data).
 */
export async function DELETE() {
  try {
    const user = await requireCurrentUser();
    const clerkUserId = user.clerkUserId;

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Account is not linked to Clerk' },
        { status: 400 }
      );
    }

    const client = await clerkClient();
    await client.users.deleteUser(clerkUserId);

    await db.user.delete({
      where: { id: user.id },
    });

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    const message =
      error instanceof Error && process.env.NODE_ENV === 'development'
        ? error.message
        : 'Failed to delete account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
