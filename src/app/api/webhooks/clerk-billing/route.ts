import { NextResponse } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

const VALID_PLAN_SLUGS = ['basic', 'premium', 'ultimate'] as const;

/**
 * POST /api/webhooks/clerk-billing
 * Handles Clerk Billing webhook events to sync User.plan in our database.
 * Configure this URL in Clerk Dashboard → Webhooks (subscribe to Billing events).
 * Set CLERK_WEBHOOK_SIGNING_SECRET (or the Billing endpoint's signing secret) in env.
 */
export async function POST(req: Request) {
  try {
    const evt = await verifyWebhook(req);

    if (evt.type === 'subscriptionItem.active') {
      const data = evt.data as {
        plan?: { slug: string } | null;
        payer?: { user_id?: string } | null;
      };
      const clerkUserId = data.payer?.user_id;
      const planSlug = data.plan?.slug;

      if (!clerkUserId) return NextResponse.json({ received: true });

      const slug =
        planSlug && VALID_PLAN_SLUGS.includes(planSlug as (typeof VALID_PLAN_SLUGS)[number])
          ? planSlug
          : 'basic';

      await db.user.updateMany({
        where: { clerkUserId },
        data: { plan: slug },
      });

      try {
        const client = await clerkClient();
        await client.users.updateUser(clerkUserId, {
          publicMetadata: { plan: slug },
        });
      } catch {
        // DB is source of truth; non-fatal
      }

      return NextResponse.json({ received: true });
    }

    if (
      evt.type === 'subscriptionItem.ended' ||
      evt.type === 'subscriptionItem.canceled'
    ) {
      const data = evt.data as { payer?: { user_id?: string } | null };
      const clerkUserId = data.payer?.user_id;

      if (!clerkUserId) return NextResponse.json({ received: true });

      await db.user.updateMany({
        where: { clerkUserId },
        data: { plan: 'basic' },
      });

      try {
        const client = await clerkClient();
        await client.users.updateUser(clerkUserId, {
          publicMetadata: { plan: 'basic' },
        });
      } catch {
        // DB is source of truth; non-fatal
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Clerk Billing webhook error:', err);
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 400 }
    );
  }
}
