import { db } from '@/lib/db';

const FREE_PDF_IMPORTS_PER_MONTH = 3;

/**
 * Which Stripe subscription statuses grant Premium.
 *
 * past_due is included on purpose: the renewal charge failed and Stripe is retrying the
 * card (dunning). We keep access during the retry window and ask the user to update their
 * card. If every retry fails, Stripe moves the subscription to unpaid or canceled and
 * access ends. incomplete (first payment never succeeded) never grants access.
 */
const PREMIUM_STATUSES = new Set(['active', 'trialing', 'past_due']);

export type BillingState = {
  plan: 'free' | 'premium';
  status: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  paymentFailed: boolean;
  nextPaymentAttemptAt: string | null;
  pdfImportsUsed: number;
  pdfImportsLimit: number | null;
};

export async function getBillingState(userId: number): Promise<BillingState> {
  const [subscription, pdfImportsUsed] = await Promise.all([
    db.subscription.findUnique({ where: { userId } }),
    countPdfImportsThisMonth(userId),
  ]);
  const premium = subscription ? isPremiumStatus(subscription.status) : false;
  const paymentFailed = subscription?.status === 'past_due';
  const failedPayment = paymentFailed
    ? await db.payment.findFirst({
        where: { userId, status: 'open' },
        orderBy: { updatedAt: 'desc' },
      })
    : null;

  return {
    plan: premium ? 'premium' : 'free',
    status: subscription?.status ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    paymentFailed,
    nextPaymentAttemptAt: failedPayment?.nextPaymentAttemptAt?.toISOString() ?? null,
    pdfImportsUsed,
    pdfImportsLimit: premium ? null : FREE_PDF_IMPORTS_PER_MONTH,
  };
}

export async function checkPdfImportAllowed(userId: number): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const state = await getBillingState(userId);
  const allowed = state.pdfImportsLimit === null || state.pdfImportsUsed < state.pdfImportsLimit;
  return { allowed, used: state.pdfImportsUsed, limit: state.pdfImportsLimit };
}

export function isPremiumStatus(status: string): boolean {
  return PREMIUM_STATUSES.has(status);
}

function countPdfImportsThisMonth(userId: number): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return db.pdfProcessingJob.count({
    // Failed parses don't use up the free allowance.
    where: { userId, createdAt: { gte: monthStart }, status: { not: 'failed' } },
  });
}
