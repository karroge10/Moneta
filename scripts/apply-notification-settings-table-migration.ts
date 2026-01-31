/**
 * Manual migration: Create UserNotificationSettings table and migrate data.
 * Use when "prisma migrate deploy" times out (Neon advisory lock).
 * Run: npx tsx scripts/apply-notification-settings-table-migration.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';

const MIGRATION_NAME = '20250131100000_notification_settings_table';

async function main() {
  const prisma = new PrismaClient();

  // Check if table already exists
  const tableExists = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'UserNotificationSettings'
  `;
  if (Number(tableExists[0]?.count ?? 0) > 0) {
    console.log('UserNotificationSettings table already exists');
  } else {
    // Create table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "UserNotificationSettings" (
        "id" SERIAL NOT NULL,
        "userId" INTEGER NOT NULL,
        "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
        "upcomingBills" BOOLEAN NOT NULL DEFAULT true,
        "upcomingIncome" BOOLEAN NOT NULL DEFAULT true,
        "investments" BOOLEAN NOT NULL DEFAULT true,
        "goals" BOOLEAN NOT NULL DEFAULT true,
        "promotionalEmail" BOOLEAN NOT NULL DEFAULT true,
        "aiInsights" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "UserNotificationSettings_userId_key" ON "UserNotificationSettings"("userId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX "UserNotificationSettings_userId_idx" ON "UserNotificationSettings"("userId")`);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);
    console.log('Created UserNotificationSettings table');

    // Migrate data
    const hasColumn = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'notificationSettings'
    `;
    if (Number(hasColumn[0]?.count ?? 0) > 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "UserNotificationSettings" ("userId", "pushNotifications", "upcomingBills", "upcomingIncome", "investments", "goals", "promotionalEmail", "aiInsights")
        SELECT id,
          COALESCE((("notificationSettings"->>'pushNotifications')::boolean), true),
          COALESCE((("notificationSettings"->>'upcomingBills')::boolean), true),
          COALESCE((("notificationSettings"->>'upcomingIncome')::boolean), true),
          COALESCE((("notificationSettings"->>'investments')::boolean), true),
          COALESCE((("notificationSettings"->>'goals')::boolean), true),
          COALESCE((("notificationSettings"->>'promotionalEmail')::boolean), true),
          COALESCE((("notificationSettings"->>'aiInsights')::boolean), true)
        FROM "User"
      `);
      console.log('Migrated data from User.notificationSettings');
    } else {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "UserNotificationSettings" ("userId", "pushNotifications", "upcomingBills", "upcomingIncome", "investments", "goals", "promotionalEmail", "aiInsights")
        SELECT id, true, true, true, true, true, true, true FROM "User"
      `);
      console.log('Inserted defaults for all users');
    }

    // Drop column from User
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" DROP COLUMN IF EXISTS "notificationSettings"
    `);
    console.log('Dropped notificationSettings column from User');
  }

  // Mark migration as applied
  const escaped = MIGRATION_NAME.replace(/'/g, "''");
  await prisma.$executeRawUnsafe(`
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    SELECT gen_random_uuid(), '', NOW(), '${escaped}', NULL, NULL, NOW(), 1
    WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '${escaped}')
  `);
  console.log('Migration marked as applied');
}

main()
  .catch(console.error)
  .finally(() => process.exit());
