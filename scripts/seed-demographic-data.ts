/**
 * Seed fake users and transaction data for demographic comparisons.
 * Run after main seed (prisma/seed.ts): npm run seed:demographic
 *
 * Creates ~29 demo users (no clerkUserId) with dataSharingEnabled: true:
 * - ~25 spread across age groups 18-24, 25-34, 35-44, 45-54, 55+, countries (United States, Georgia, Germany), professions (Engineer, Teacher, Designer, Manager, Developer)
 * - 4 extra users for cohort (18-24, Georgia, Developer) so comparisons work for 24yo in Georgia, profession developer
 *
 * Country values match the app (country names: "Georgia", "United States", "Germany").
 * If you previously ran with country codes (US, GE, DE), delete demo users first and re-run.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') });
}

const prisma = new PrismaClient();

const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55+'] as const;
/** Country names as stored by the app (Settings uses COUNTRIES[].name). */
const COUNTRIES = ['United States', 'Georgia', 'Germany'];
const PROFESSIONS = ['Engineer', 'Teacher', 'Designer', 'Manager', 'Developer'];

/** Date of birth that places user in the given age group (age as of current year). */
function dateOfBirthForAgeGroup(ageGroup: string, indexInGroup: number): Date {
  const currentYear = new Date().getFullYear();
  let year: number;
  switch (ageGroup) {
    case '18-24':
      // Ages 18–24: e.g. birth years 2001–2007 (for 2025)
      year = currentYear - 24 + (indexInGroup % 7);
      break;
    case '25-34':
      year = currentYear - 34 + (indexInGroup % 10); // ages 25–34
      break;
    case '35-44':
      year = currentYear - 44 + (indexInGroup % 10);
      break;
    case '45-54':
      year = currentYear - 54 + (indexInGroup % 10);
      break;
    case '55+':
      year = currentYear - 69 + (indexInGroup % 15); // ages 55–69
      break;
    default:
      year = currentYear - 30;
  }
  return new Date(year, 5, 15); // June 15
}

async function main() {
  console.log('Seeding demographic comparison data...\n');

  const usd = await prisma.currency.findFirst({ where: { alias: 'USD' } });
  if (!usd) {
    console.error('USD currency not found. Run prisma/seed.ts first.');
    process.exit(1);
  }

  const categories = await prisma.category.findMany();
  const categoryByName = new Map(categories.map((c) => [c.name, c]));
  const salaryCategory = categoryByName.get('Salary');
  const rentCategory = categoryByName.get('Rent');
  const groceriesCategory = categoryByName.get('Groceries');
  const restaurantsCategory = categoryByName.get('Restaurants');
  const entertainmentCategory = categoryByName.get('Entertainment');

  if (!salaryCategory || !rentCategory || !groceriesCategory) {
    console.error('Required categories (Salary, Rent, Groceries) not found. Run prisma/seed.ts first.');
    process.exit(1);
  }

  // Check if demo users already exist (idempotent: skip if present)
  const existingDemo = await prisma.user.findFirst({
    where: { userName: { startsWith: 'demo_' } },
  });
  if (existingDemo) {
    console.log('Demo users already exist (userName starts with "demo_"). Skipping seed.');
    console.log('To re-seed, delete demo users first.\n');
    return;
  }

  const demoUserConfigs: Array<{
    ageGroup: string;
    country: string;
    profession: string;
    incomeMultiplier: number;
    expenseMultiplier: number;
  }> = [];
  let idx = 0;
  for (const ageGroup of AGE_GROUPS) {
    const count = ageGroup === '55+' ? 4 : 5;
    for (let i = 0; i < count; i++) {
      demoUserConfigs.push({
        ageGroup,
        country: COUNTRIES[idx % COUNTRIES.length],
        profession: PROFESSIONS[idx % PROFESSIONS.length],
        incomeMultiplier: 0.7 + Math.random() * 0.6,
        expenseMultiplier: 0.6 + Math.random() * 0.8,
      });
      idx++;
    }
  }

  const createdUsers: Array<{ id: number; userName: string; config: (typeof demoUserConfigs)[0] }> = [];

  for (let u = 0; u < demoUserConfigs.length; u++) {
    const cfg = demoUserConfigs[u];
    const userName = `demo_${cfg.ageGroup.replace('+', 'plus').replace('-', '_')}_${u + 1}`;
    const dateOfBirth = dateOfBirthForAgeGroup(cfg.ageGroup, u);

    const user = await prisma.user.create({
      data: {
        userName,
        firstName: `Demo`,
        lastName: `User ${u + 1}`,
        dateOfBirth,
        country: cfg.country,
        profession: cfg.profession,
        dataSharingEnabled: true,
        currencyId: usd.id,
        clerkUserId: null,
      },
    });
    createdUsers.push({ id: user.id, userName: user.userName!, config: cfg });
  }

  // Extra users for cohort (24yo, Georgia, Developer): ensure 18-24 + Georgia + Developer has enough for comparisons
  const EXTRA_FOR_COHORT = 4;
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < EXTRA_FOR_COHORT; i++) {
    const userName = `demo_18_24_georgia_dev_${i + 1}`;
    const dateOfBirth = new Date(currentYear - 24 + (i % 5), 5, 15); // ages 20–24
    const user = await prisma.user.create({
      data: {
        userName,
        firstName: 'Demo',
        lastName: `Georgia Dev ${i + 1}`,
        dateOfBirth,
        country: 'Georgia',
        profession: 'Developer',
        dataSharingEnabled: true,
        currencyId: usd.id,
        clerkUserId: null,
      },
    });
    createdUsers.push({
      id: user.id,
      userName: user.userName!,
      config: {
        ageGroup: '18-24',
        country: 'Georgia',
        profession: 'Developer',
        incomeMultiplier: 0.75 + Math.random() * 0.5,
        expenseMultiplier: 0.65 + Math.random() * 0.7,
      },
    });
  }
  console.log(`Created ${createdUsers.length} demo users (including ${EXTRA_FOR_COHORT} for 18-24 + Georgia + Developer).\n`);

  const now = new Date();
  const startMonth = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const numMonths = 10;

  for (const { id: userId, config: cfg } of createdUsers) {
    const baseIncome = 4000 * cfg.incomeMultiplier;
    const baseRent = 1200 * cfg.expenseMultiplier;
    const baseGroceries = 400 * cfg.expenseMultiplier;
    const baseRestaurants = 250 * cfg.expenseMultiplier;

    const txs: Array<{
      userId: number;
      type: string;
      amount: number;
      description: string;
      source: string;
      date: Date;
      categoryId: number;
      currencyId: number;
    }> = [];

    for (let m = 0; m < numMonths; m++) {
      const monthStart = new Date(startMonth.getFullYear(), startMonth.getMonth() + m, 1);
      const monthLabel = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;

      txs.push({
        userId,
        type: 'income',
        amount: Math.round(baseIncome * (0.95 + Math.random() * 0.1)),
        description: `Salary - ${monthLabel}`,
        source: 'demographic_seed',
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 5, 12, 0, 0),
        categoryId: salaryCategory.id,
        currencyId: usd.id,
      });

      txs.push({
        userId,
        type: 'expense',
        amount: Math.round(baseRent * (0.98 + Math.random() * 0.04)),
        description: `Rent - ${monthLabel}`,
        source: 'demographic_seed',
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 1, 12, 0, 0),
        categoryId: rentCategory.id,
        currencyId: usd.id,
      });

      txs.push({
        userId,
        type: 'expense',
        amount: Math.round(baseGroceries * (0.9 + Math.random() * 0.2)),
        description: `Groceries - ${monthLabel}`,
        source: 'demographic_seed',
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 8, 12, 0, 0),
        categoryId: groceriesCategory.id,
        currencyId: usd.id,
      });

      txs.push({
        userId,
        type: 'expense',
        amount: Math.round(baseRestaurants * (0.8 + Math.random() * 0.4)),
        description: `Restaurants - ${monthLabel}`,
        source: 'demographic_seed',
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 15, 12, 0, 0),
        categoryId: restaurantsCategory?.id ?? entertainmentCategory!.id,
        currencyId: usd.id,
      });

      const transport = categoryByName.get('Transportation');
      if (transport) {
        txs.push({
          userId,
          type: 'expense',
          amount: Math.round(120 * cfg.expenseMultiplier * (0.9 + Math.random() * 0.2)),
          description: `Transportation - ${monthLabel}`,
          source: 'demographic_seed',
          date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 12, 12, 0, 0),
          categoryId: transport.id,
          currencyId: usd.id,
        });
      }
    }

    await prisma.transaction.createMany({ data: txs });
  }

  const totalTxs = createdUsers.length * numMonths * 5;
  console.log(`Created ~${totalTxs} transactions for demo users.\n`);

  // Optional: add a few goals and investments for a subset of users
  for (let i = 0; i < Math.min(10, createdUsers.length); i++) {
    const u = createdUsers[i];
    const targetAmount = 2000 + Math.random() * 3000;
    await prisma.goal.create({
      data: {
        userId: u.id,
        name: `Savings goal ${i + 1}`,
        targetDate: new Date(now.getFullYear() + 1, 5, 1),
        targetAmount,
        currentAmount: Math.round(targetAmount * (0.2 + Math.random() * 0.7)),
      },
    });
  }

  const investmentUsers = createdUsers.slice(0, 8);
  for (const u of investmentUsers) {
    await prisma.investment.create({
      data: {
        userId: u.id,
        name: 'Demo Portfolio',
        subtitle: 'Stocks & bonds',
        assetType: 'stock',
        sourceType: 'manual',
        quantity: 1,
        purchasePrice: 5000,
        purchaseDate: new Date(now.getFullYear() - 1, 0, 1),
        purchaseCurrencyId: usd.id,
        currentValue: 5000 * (0.85 + Math.random() * 0.3),
        changePercent: -15 + Math.random() * 25,
        icon: 'BitcoinCircle',
      },
    });
  }

  console.log('Demographic seed complete. Demo users have dataSharingEnabled: true.');
  console.log('Enable data sharing for your account in Settings to see comparisons.\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
