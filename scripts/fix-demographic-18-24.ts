/**
 * Fix existing demo_18_24_* users so they actually fall in age group 18-24.
 * Old seed used birth years 1996–2000 which put them in 25-34. This script
 * updates their dateOfBirth to 2001–2005 (ages 24–20) so getAgeGroup returns '18-24'.
 *
 * Run: npx tsx scripts/fix-demographic-18-24.ts
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
  const currentYear = new Date().getFullYear();
  const demo18_24 = await prisma.user.findMany({
    where: { userName: { startsWith: 'demo_18_24_' } },
    select: { id: true, userName: true, dateOfBirth: true },
    orderBy: { id: 'asc' },
  });

  console.log(`Found ${demo18_24.length} users with userName demo_18_24_*`);
  if (demo18_24.length === 0) {
    console.log('Nothing to fix. Run seed:demographic to create demo users.');
    return;
  }

  for (let i = 0; i < demo18_24.length; i++) {
    const u = demo18_24[i];
    const newYear = currentYear - 24 + (i % 7); // 2001–2007 so ages 24–18
    const newDob = new Date(newYear, 5, 15); // June 15
    const ag = getAgeGroup(newDob);
    if (ag !== '18-24') {
      console.warn(`  ${u.userName} new DOB ${newDob.toISOString()} -> ageGroup ${ag} (expected 18-24)`);
    }
    await prisma.user.update({
      where: { id: u.id },
      data: { dateOfBirth: newDob },
    });
    console.log(`  Updated id=${u.id} ${u.userName} -> dob=${newDob.toISOString().slice(0, 10)} ageGroup=${ag}`);
  }

  console.log('\nDone. Re-run check-demographic-cohort to verify.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
