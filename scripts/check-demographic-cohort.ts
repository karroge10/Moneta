/**
 * Check users and age groups for demographic comparisons.
 * Run: npx tsx scripts/check-demographic-cohort.ts
 * Uses DATABASE_URL from .env.local or .env.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') });
}

const prisma = new PrismaClient();

function getAgeGroup(dateOfBirth: Date | null): string | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  if (age >= 55) return '55+';
  if (age >= 45) return '45-54';
  if (age >= 35) return '35-44';
  if (age >= 25) return '25-34';
  if (age >= 18) return '18-24';
  return null;
}

async function main() {
  console.log('Checking users for demographic cohort...\n');

  const allWithSharing = await prisma.user.findMany({
    where: { dataSharingEnabled: true },
    select: { id: true, userName: true, dateOfBirth: true, country: true, profession: true, clerkUserId: true },
    orderBy: { id: 'asc' },
  });

  console.log('Users with dataSharingEnabled: true:', allWithSharing.length);
  if (allWithSharing.length === 0) {
    console.log('No users with data sharing enabled. Enable it in Settings and/or run seed:demographic.\n');
    return;
  }

  const byAgeGroup = new Map<string, typeof allWithSharing>();
  for (const u of allWithSharing) {
    const ag = getAgeGroup(u.dateOfBirth) ?? '(null/under 18)';
    if (!byAgeGroup.has(ag)) byAgeGroup.set(ag, []);
    byAgeGroup.get(ag)!.push(u);
  }

  console.log('\nBy age group (getAgeGroup(dob)):');
  for (const [ag, users] of Array.from(byAgeGroup.entries()).sort()) {
    console.log(`  ${ag}: ${users.length} user(s)`);
    for (const u of users.slice(0, 5)) {
      console.log(
        `    id=${u.id} userName=${u.userName ?? '-'} dob=${u.dateOfBirth?.toISOString?.() ?? 'null'} country=${u.country ?? '-'} profession=${u.profession ?? '-'} clerk=${u.clerkUserId ? 'yes' : 'no'}`
      );
    }
    if (users.length > 5) console.log(`    ... and ${users.length - 5} more`);
  }

  console.log('\nAll users (id, dob, ageGroup, country, profession):');
  for (const u of allWithSharing) {
    const ag = getAgeGroup(u.dateOfBirth);
    console.log(`  id=${u.id} dob=${u.dateOfBirth?.toISOString?.() ?? 'null'} ageGroup=${ag ?? 'null'} country=${JSON.stringify(u.country)} profession=${JSON.stringify(u.profession)}`);
  }

  const txCounts = await prisma.transaction.groupBy({
    by: ['userId'],
    _count: { id: true },
    where: { userId: { in: allWithSharing.map((u) => u.id) } },
  });
  const txByUser = new Map(txCounts.map((t) => [t.userId, t._count.id]));
  console.log('\nTransaction counts per user (cohort users):');
  for (const u of allWithSharing) {
    console.log(`  userId=${u.id} transactions=${txByUser.get(u.id) ?? 0}`);
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
