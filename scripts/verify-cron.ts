/**
 * Verify cron-related configuration and database health.
 *
 * Read-only (default): checks DB connectivity, recent cron side-effect data, and vercel.json cron path.
 *
 * Usage:
 *   npx tsx scripts/verify-cron.ts
 *   npx tsx scripts/verify-cron.ts --invoke http://localhost:3000
 *   npx tsx scripts/verify-cron.ts --invoke https://your-app.vercel.app
 *
 * --invoke sends GET /api/cron/recurring with x-cron-secret (from CRON_SECRET env).
 * That runs the full production job (all users). Use dev DB or expect long runtime.
 *
 * Env: loads .env.local then .env (same pattern as other scripts).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';

const RECURRING_REMINDER_DAYS = 3;
const GOAL_DEADLINE_DAYS = 7;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(base: Date, days: number): Date {
  const t = new Date(base);
  t.setUTCDate(t.getUTCDate() + days);
  return t;
}

function parseArgs(): { invokeBaseUrl: string | null } {
  const idx = process.argv.indexOf('--invoke');
  if (idx === -1) return { invokeBaseUrl: null };
  const url = process.argv[idx + 1];
  if (!url || url.startsWith('--')) {
    return { invokeBaseUrl: 'http://localhost:3000' };
  }
  return { invokeBaseUrl: url.replace(/\/$/, '') };
}

async function checkVercelCronConfig(): Promise<void> {
  const p = resolve(process.cwd(), 'vercel.json');
  if (!existsSync(p)) {
    console.log('[WARN] vercel.json not found');
    return;
  }
  try {
    const raw = readFileSync(p, 'utf8');
    const j = JSON.parse(raw) as { crons?: { path: string; schedule: string }[] };
    const crons = j.crons ?? [];
    const recurring = crons.find((c) => c.path === '/api/cron/recurring');
    if (recurring) {
      console.log(`[OK] vercel.json: cron path ${recurring.path} schedule "${recurring.schedule}"`);
    } else {
      console.log('[WARN] vercel.json: no cron entry for /api/cron/recurring');
    }
  } catch (e) {
    console.log('[WARN] vercel.json: could not parse', e);
  }
}

async function main() {
  const { invokeBaseUrl } = parseArgs();
  let exitCode = 0;

  console.log('--- Moneta cron verification ---\n');

  await checkVercelCronConfig();

  if (!process.env.DATABASE_URL) {
    console.error('[FAIL] DATABASE_URL is not set');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('[OK] Database connection');
  } catch (e) {
    console.error('[FAIL] Database connection:', e);
    process.exit(1);
  }

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const userCount = await prisma.user.count();
  console.log(`[INFO] Users: ${userCount}`);

  const currencies = await prisma.currency.findMany({ select: { id: true, alias: true } });
  const usd = currencies.find((c) => c.alias.toLowerCase() === 'usd');
  if (!usd) {
    console.log('[WARN] No USD row in Currency — exchange rate job may skip updates');
  } else {
    console.log(`[OK] USD currency present (id ${usd.id})`);
  }

  const notif24 = await prisma.notification.count({ where: { createdAt: { gte: since24h } } });
  const notifByType = await prisma.notification.groupBy({
    by: ['type'],
    where: { createdAt: { gte: since48h } },
    _count: { id: true },
  });
  console.log(`[INFO] Notifications created last 24h: ${notif24}`);
  if (notifByType.length > 0) {
    console.log('[INFO] Notifications by type (last 48h):');
    for (const row of notifByType.sort((a, b) => b._count.id - a._count.id)) {
      console.log(`       ${row.type}: ${row._count.id}`);
    }
  }

  const latestNotif = await prisma.notification.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true, type: true, createdAt: true },
  });
  if (latestNotif) {
    console.log(`[INFO] Latest notification: #${latestNotif.id} ${latestNotif.type} at ${latestNotif.createdAt.toISOString()}`);
  } else {
    console.log('[INFO] No notifications in database');
  }

  const snap24 = await prisma.portfolioSnapshot.count({ where: { timestamp: { gte: since24h } } });
  const latestSnap = await prisma.portfolioSnapshot.findFirst({
    orderBy: { timestamp: 'desc' },
    select: { id: true, userId: true, timestamp: true, totalValue: true },
  });
  console.log(`[INFO] Portfolio snapshots last 24h: ${snap24}`);
  if (latestSnap) {
    console.log(
      `[INFO] Latest snapshot: user ${latestSnap.userId} at ${latestSnap.timestamp.toISOString()} value=${latestSnap.totalValue}`,
    );
  }

  const latestRate = await prisma.exchangeRate.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, rateDate: true, updatedAt: true },
  });
  const ratesTodayStart = startOfUtcDay(now);
  const ratesTodayCount = await prisma.exchangeRate.count({
    where: { rateDate: { gte: ratesTodayStart } },
  });
  console.log(`[INFO] ExchangeRate rows with rateDate >= today (UTC): ${ratesTodayCount}`);
  if (latestRate) {
    console.log(
      `[INFO] Latest exchange rate row updated: ${latestRate.updatedAt.toISOString()} rateDate=${latestRate.rateDate.toISOString()}`,
    );
  }

  const todayStart = startOfUtcDay(now);
  const recurringWindowEnd = addUtcDays(todayStart, RECURRING_REMINDER_DAYS);
  recurringWindowEnd.setUTCHours(23, 59, 59, 999);

  const recurringDueSoon = await prisma.recurringTransaction.count({
    where: {
      isActive: true,
      nextDueDate: { gte: todayStart, lte: recurringWindowEnd },
    },
  });
  console.log(
    `[INFO] Active recurring with nextDueDate in UTC window [today .. +${RECURRING_REMINDER_DAYS}d]: ${recurringDueSoon} (candidates for bill/income reminders)`,
  );

  const goalWindowEnd = addUtcDays(todayStart, GOAL_DEADLINE_DAYS);
  goalWindowEnd.setUTCHours(23, 59, 59, 999);
  const goals = await prisma.goal.findMany({
    select: { id: true, currentAmount: true, targetAmount: true, targetDate: true },
  });
  let goalDeadlineCandidates = 0;
  for (const g of goals) {
    if (g.targetAmount <= 0) continue;
    const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
    if (pct >= 100) continue;
    if (g.targetDate >= todayStart && g.targetDate <= goalWindowEnd) goalDeadlineCandidates++;
  }
  console.log(
    `[INFO] Goals with target within ${GOAL_DEADLINE_DAYS}d (UTC) and not yet 100%: ${goalDeadlineCandidates} (candidates for deadline reminders)`,
  );

  const settingsRows = await prisma.userNotificationSettings.count();
  console.log(`[INFO] UserNotificationSettings rows: ${settingsRows} (users with prefs: ${settingsRows})`);

  console.log('\n--- Summary ---');
  console.log('Read-only checks finished. Empty counts are normal if cron has not run recently or data does not match rules.');
  console.log('');

  if (invokeBaseUrl) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      console.error('[FAIL] --invoke requires CRON_SECRET in environment');
      process.exit(1);
    }
    const url = `${invokeBaseUrl}/api/cron/recurring`;
    console.log(`[WARN] Invoking cron (may take minutes, mutates DB): ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300_000);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'x-cron-secret': secret },
        signal: controller.signal,
      });
      const text = await res.text();
      let body: unknown;
      try {
        body = JSON.parse(text) as Record<string, unknown>;
      } catch {
        body = text;
      }
      if (!res.ok) {
        console.error(`[FAIL] HTTP ${res.status}`, body);
        exitCode = 1;
      } else {
        console.log('[OK] Cron HTTP response:', res.status);
        console.log(JSON.stringify(body, null, 2));
        if (typeof body === 'object' && body !== null && (body as { success?: boolean }).success !== true) {
          console.error('[FAIL] Response JSON success !== true');
          exitCode = 1;
        }
      }
    } catch (e) {
      console.error('[FAIL] Cron request error:', e);
      exitCode = 1;
    } finally {
      clearTimeout(timeout);
    }
  } else {
    console.log('Tip: run with --invoke <baseUrl> to hit the live endpoint (needs CRON_SECRET).');
  }

  await prisma.$disconnect();
  process.exit(exitCode);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
