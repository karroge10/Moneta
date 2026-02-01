import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * GET /api/plans
 * Fetches billing plans from Clerk (user-level) for display on pricing page.
 * Returns plans with id (slug), name, description, monthlyPrice, yearlyPrice, features.
 * If Clerk Billing is not set up or returns empty, returns { plans: [] } so the client can fall back to local data.
 */
export async function GET() {
  try {
    const client = await clerkClient();
    const { data } = await client.billing.getPlanList({
      payerType: 'user',
      limit: 50,
    });

    const plans = (data ?? []).map((plan) => {
      const monthlyPrice =
        plan.fee?.amount != null ? Number(plan.fee.amount) / 100 : 0;
      const yearlyPrice =
        plan.annualFee?.amount != null
          ? Number(plan.annualFee.amount) / 100
          : monthlyPrice * 12;

      return {
        id: plan.slug,
        clerkPlanId: plan.id,
        name: plan.name ?? plan.slug,
        description: plan.description ?? '',
        monthlyPrice,
        yearlyPrice,
        features: (plan.features ?? []).map((f) => ({
          key: f.slug,
          name: f.name ?? f.slug,
          description: f.description ?? '',
        })),
      };
    });

    // Stable order: basic, premium, ultimate (if slugs match)
    const order = ['basic', 'premium', 'ultimate'];
    const sorted = [...plans].sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id)
    );

    return NextResponse.json({ plans: sorted });
  } catch (err) {
    console.error('Error fetching plans from Clerk:', err);
    return NextResponse.json({ plans: [] });
  }
}
