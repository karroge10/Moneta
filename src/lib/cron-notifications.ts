

import { db } from './db';
import { createNotification } from './notifications';
import { calculateGoalProgress } from './goalUtils';
import { moneyToNumber } from './money';
import { addUtcDays, startOfUtcDay, toDateKey } from './dates';


const RECURRING_LOOKAHEAD_DAYS = 3;


const GOAL_DEADLINE_LOOKAHEAD_DAYS = 7;


const DEDUPE_WINDOW_MS = 36 * 60 * 60 * 1000;

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


async function notifyUpcomingRecurring(userId: number, now: Date): Promise<void> {
  const todayStart = startOfUtcDay(now);
  const windowEnd = addUtcDays(todayStart, RECURRING_LOOKAHEAD_DAYS);
  
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
    const ymd = toDateKey(due);
    const dedupeToken = `#rt:${item.id}:${ymd}`;
    const notifType = item.type === 'income' ? 'Upcoming Income' : 'Upcoming Bills';

    if (await hasRecentDedupe(userId, notifType, dedupeToken)) continue;

    const symbol = item.currency?.symbol ?? '$';
    const amount = moneyToNumber(item.amount);
    const amountStr = `${symbol}${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    const label = item.type === 'income' ? 'Income' : 'Bill';
    const line = `${label} "${item.name}" due ${formatDueLine(due)} (${amountStr}). ${dedupeToken}`;

    await createNotification(userId, { type: notifType, text: line });
  }
}


async function notifyGoalEvents(userId: number, now: Date): Promise<void> {
  const todayStart = startOfUtcDay(now);
  const deadlineEnd = addUtcDays(todayStart, GOAL_DEADLINE_LOOKAHEAD_DAYS);
  deadlineEnd.setUTCHours(23, 59, 59, 999);

  const goals = await db.goal.findMany({
    where: { userId },
    include: { currency: true },
  });

  for (const goal of goals) {
    const progress = calculateGoalProgress(goal.currentAmount, goal.targetAmount);
    const currentAmount = moneyToNumber(goal.currentAmount);
    const targetAmount = moneyToNumber(goal.targetAmount);
    const target = goal.targetDate;

    if (progress >= 100) {
      if (await hasGoalCompleteEver(userId, goal.id)) continue;
      const dedupeToken = `#goal:${goal.id}:complete`;
      const symbol = goal.currency?.symbol ?? '$';
      const line = `Goal reached: "${goal.name}" (${symbol}${currentAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}). ${dedupeToken}`;
      await createNotification(userId, { type: 'Goal Update', text: line });
      continue;
    }

    if (target < todayStart) continue;
    if (target > deadlineEnd) continue;

    const ymd = toDateKey(target);
    const dedupeToken = `#goal:${goal.id}:deadline:${ymd}`;
    if (await hasGoalDeadlineToken(userId, dedupeToken)) continue;

    const symbol = goal.currency?.symbol ?? '$';
    const line = `Goal "${goal.name}" target ${formatDueLine(target)}: ${progress.toFixed(0)}% done (${symbol}${currentAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })} of ${symbol}${targetAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}). ${dedupeToken}`;
    await createNotification(userId, { type: 'Goal Update', text: line });
  }
}

export async function runUserScheduledNotifications(userId: number, now: Date): Promise<void> {
  await notifyUpcomingRecurring(userId, now);
  await notifyGoalEvents(userId, now);
}
