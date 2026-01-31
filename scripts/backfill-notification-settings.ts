/**
 * One-off: Create UserNotificationSettings for users who don't have a row.
 * Run with: npx tsx scripts/backfill-notification-settings.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const existing = await prisma.userNotificationSettings.findMany({
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((r) => r.userId));
  const users = await prisma.user.findMany({
    where: { id: { notIn: Array.from(existingIds) } },
    select: { id: true },
  });
  for (const u of users) {
    await prisma.userNotificationSettings.create({
      data: {
        userId: u.id,
        pushNotifications: true,
        upcomingBills: true,
        upcomingIncome: true,
        investments: true,
        goals: true,
        promotionalEmail: true,
        aiInsights: true,
      },
    });
  }
  console.log(`Created notification settings for ${users.length} users`);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
