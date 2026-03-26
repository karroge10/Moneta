/**
 * Scheduled in-app notifications for recurring items and goals.
 * Invoked from /api/cron/recurring per user after recurring transactions are processed.
 *
 * Lookahead windows use UTC calendar dates for stable cron behavior (documented tradeoff vs user TZ).
 */

import { db } from './db';
import { createNotification } from './notifications';
import { calculateGoalProgress } from './goalUtils';

/** Notify when a recurring item is due within this many days from today (UTC), inclusive. */
const RECURRING_LOOKAHEAD_DAYS = 3;

/** Warn when a goal target date is within this many days (UTC) and not yet met. */
const GOAL_DEADLINE_LOOKAHEAD_DAYS = 7;

/** Skip creating a new row if the same dedupe token was used for this type recently. */
const DEDUPE_WINDOW_MS = 36 * 60 * 60 * 1000;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(base: Date, days: number): Date {
  const t = new Date(base);
  t.setUTCDate(t.getUTCDate() + days);
  return t;
}

function toYmdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDueLine(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

async function hasRecentDedupe(
  userId: number,
  notificationType: string,
  dedupeToken: string,
): Promise<boolean> {
  const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
  const existing = await db.notification.findFirst({
    where: {
      userId,
      type: notificationType,
      text: { contains: dedupeToken },
      createdAt: { gte: since },
    },
  });
  return existing != null;
}

async function hasGoalCompleteEver(userId: number, goalId: number): Promise<boolean> {
  const token = `#goal:${goalId}:complete`;
  const existing = await db.notification.findFirst({
    where: {
      userId,
      type: 'Goal Update',
      text: { contains: token },
    },
  });
  return existing != null;
}

async function hasGoalDeadlineToken(userId: number, token: string): Promise<boolean> {
  const existing = await db.notification.findFirst({
    where: {
      userId,
      type: 'Goal Update',
      text: { contains: token },
    },
  });
  return existing != null;
}

/**
 * Remind about upcoming recurring expenses/income. Dedupe per recurring row + due date (UTC day).
 */
export async function notifyUpcomingRecurring(userId: number, now: Date): Promise<void> {
  const todayStart = startOfUtcDay(now);
  const windowEnd = addUtcDays(todayStart, RECURRING_LOOKAHEAD_DAYS);
  // end of last included day
  windowEnd.setUTCHours(23, 59, 59, 999);

  const items = await db.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      nextDueDate: {
        gte: todayStart,
        lte: windowEnd,
      },
    },
    include: { currency: true },
  });

  for (const item of items) {
    const due = item.nextDueDate;
    const ymd = toYmdUtc(due);
    const dedupeToken = `#rt:${item.id}:${ymd}`;
    const notifType = item.type === 'income' ? 'Upcoming Income' : 'Upcoming Bills';

    if (await hasRecentDedupe(userId, notifType, dedupeToken)) continue;

    const symbol = item.currency?.symbol ?? '$';
    const amountStr = `${symbol}${item.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    const label = item.type === 'income' ? 'Income' : 'Bill';
    const line = `${label} "${item.name}" due ${formatDueLine(due)} (${amountStr}). ${dedupeToken}`;

    await createNotification(userId, { type: notifType, text: line });
  }
}

/**
 * Goal reminders: approaching deadline (not complete), and first-time complete celebration.
 */
export async function notifyGoalEvents(userId: number, now: Date): Promise<void> {
  const todayStart = startOfUtcDay(now);
  const deadlineEnd = addUtcDays(todayStart, GOAL_DEADLINE_LOOKAHEAD_DAYS);
  deadlineEnd.setUTCHours(23, 59, 59, 999);

  const goals = await db.goal.findMany({
    where: { userId },
    include: { currency: true },
  });

  for (const goal of goals) {
    const progress = calculateGoalProgress(goal.currentAmount, goal.targetAmount);
    const target = goal.targetDate;

    if (progress >= 100) {
      if (await hasGoalCompleteEver(userId, goal.id)) continue;
      const dedupeToken = `#goal:${goal.id}:complete`;
      const symbol = goal.currency?.symbol ?? '$';
      const line = `Goal reached: "${goal.name}" (${symbol}${goal.currentAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}). ${dedupeToken}`;
      await createNotification(userId, { type: 'Goal Update', text: line });
      continue;
    }

    if (target < todayStart) continue;
    if (target > deadlineEnd) continue;

    const ymd = toYmdUtc(target);
    const dedupeToken = `#goal:${goal.id}:deadline:${ymd}`;
    if (await hasGoalDeadlineToken(userId, dedupeToken)) continue;

    const symbol = goal.currency?.symbol ?? '$';
    const line = `Goal "${goal.name}" target ${formatDueLine(target)} — ${progress.toFixed(0)}% done (${symbol}${goal.currentAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })} of ${symbol}${goal.targetAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}). ${dedupeToken}`;
    await createNotification(userId, { type: 'Goal Update', text: line });
  }
}

export async function runUserScheduledNotifications(userId: number, now: Date): Promise<void> {
  await notifyUpcomingRecurring(userId, now);
  await notifyGoalEvents(userId, now);
}
