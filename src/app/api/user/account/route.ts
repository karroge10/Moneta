import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { requireCurrentUser } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { deleteStripeCustomer } from '@/lib/billing/customers';


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

    // Deleting the Stripe customer cancels any active subscription, so the user is not billed again.
    if (user.stripeCustomerId) {
      await deleteStripeCustomer(user.stripeCustomerId);
    }

    await db.user.delete({
      where: { id: user.id },
    });

    const client = await clerkClient();
    await client.users.deleteUser(clerkUserId);

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    return errorResponse(error, 'Error deleting account:', 'Failed to delete account');
  }
}
