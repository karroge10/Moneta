/**
 * Full demo seed for a single user — fills dashboard cards (income, expenses, transactions,
 * top expenses, investments, goals, upcoming bills, financial health, insight) and enriches
 * investments/notifications pages.
 *
 * Prerequisites:
 * - `DATABASE_URL` in `.env.local` or `.env`
 * - Global seed run at least once (`npm run seed`) so categories, currencies, languages exist
 * - A `User` row already created (e.g. after Clerk sign-up / webhook) for the target account
 *
 * Usage (do not run until you have the id):
 *   npx tsx scripts/seed-demo-user-full.ts --clerk-user-id=user_xxxxxxxx
 *   npx tsx scripts/seed-demo-user-full.ts --user-id=42
 *
 * Or environment (CLI overrides env):
 *   DEMO_SEED_CLERK_USER_ID=user_xxx
 *   DEMO_SEED_USER_ID=42
 *
 * Behavior: deletes this user's app data (transactions, goals, recurring, merchants, custom
 * categories, notifications, portfolio snapshots, feedback, PDF jobs, private assets) then
 * inserts a few months of realistic activity. Does not delete the User row or touch global
 * categories/currencies/assets shared by ticker.
 */

import {
  PrismaClient,
  Prisma,
  InvestmentType,
  AssetType,
  PricingMode,
  FrequencyUnit,
  RecurringType,
} from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') });
}

const prisma = new PrismaClient();

function parseCli(): { clerkUserId?: string; userId?: number } {
  let clerkUserId = process.env.DEMO_SEED_CLERK_USER_ID?.trim() || undefined;
  let userId: number | undefined = process.env.DEMO_SEED_USER_ID
    ? parseInt(process.env.DEMO_SEED_USER_ID, 10)
    : undefined;

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--clerk-user-id=')) {
      clerkUserId = arg.slice('--clerk-user-id='.length).trim() || undefined;
    } else if (arg.startsWith('--user-id=')) {
      const n = parseInt(arg.slice('--user-id='.length), 10);
      if (!Number.isNaN(n)) userId = n;
    }
  }

  return { clerkUserId, userId };
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
}

function addMonths(d: Date, delta: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + delta);
  return x;
}

function dateInMonth(anchor: Date, monthOffset: number, day: number, hour = 12): Date {
  const m = addMonths(startOfMonth(anchor), -monthOffset);
  const dim = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const d = Math.min(Math.max(day, 1), dim);
  return new Date(m.getFullYear(), m.getMonth(), d, hour, 0, 0, 0);
}

async function wipeUserScopedData(userId: number) {
  await prisma.$transaction([
    prisma.transaction.deleteMany({ where: { userId } }),
    prisma.recurringTransaction.deleteMany({ where: { userId } }),
    prisma.goal.deleteMany({ where: { userId } }),
    prisma.merchant.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.portfolioSnapshot.deleteMany({ where: { userId } }),
    prisma.feedback.deleteMany({ where: { userId } }),
    prisma.pdfProcessingJob.deleteMany({ where: { userId } }),
    prisma.asset.deleteMany({ where: { userId } }),
  ]);
}

type CatMap = Map<string, number>;

function buildExpenseTemplates(): Array<{
  desc: string;
  category: string;
  amount: number;
  day: number;
  monthOffset: number;
}> {
  const rows: Array<{
    desc: string;
    category: string;
    amount: number;
    day: number;
    monthOffset: number;
  }> = [];

  const groceries = [
    { desc: 'Whole Foods Market', amount: 94 },
    { desc: "Trader Joe's restock", amount: 67 },
    { desc: 'Carrefour — weekend shop', amount: 112 },
    { desc: 'Spar express', amount: 38 },
    { desc: 'Costco membership + haul', amount: 186 },
  ];
  const dining = [
    { desc: 'Starbucks', amount: 6.5 },
    { desc: 'Chipotle', amount: 14 },
    { desc: 'Local bistro — dinner', amount: 78 },
    { desc: 'Uber Eats — Thai', amount: 34 },
    { desc: 'Subway lunch', amount: 11 },
  ];
  const transport = [
    { desc: 'Uber — airport run', amount: 42 },
    { desc: 'Shell — fuel', amount: 58 },
    { desc: 'Bolt city ride', amount: 9 },
    { desc: 'Metro monthly pass', amount: 45 },
  ];
  const subs = [
    { desc: 'Netflix', amount: 15.49 },
    { desc: 'Spotify Premium', amount: 11.99 },
    { desc: 'ChatGPT Plus', amount: 20 },
    { desc: 'Adobe Creative Cloud', amount: 59.99 },
    { desc: 'YouTube Premium', amount: 13.99 },
  ];
  const fun = [
    { desc: 'Cinema — IMAX tickets', amount: 28 },
    { desc: 'Steam sale', amount: 47 },
    { desc: 'PlayStation Store', amount: 69 },
  ];
  const util = [
    { desc: 'Electricity Bill — utility', amount: 84 },
    { desc: 'Water Bill', amount: 32 },
    { desc: 'Home Internet', amount: 55 },
    { desc: 'Mobile Data — carrier', amount: 42 },
  ];

  const pools = [groceries, dining, transport, subs, fun, util];
  const catNames = [
    'Groceries',
    'Restaurants',
    'Transportation',
    'Subscriptions',
    'Entertainment',
    'Electricity Bill',
  ];

  for (let mo = 0; mo < 5; mo++) {
    for (let i = 0; i < pools.length; i++) {
      const pool = pools[i];
      const cat = catNames[i];
      const pick = pool[(mo + i) % pool.length];
      rows.push({
        desc: pick.desc,
        category: cat,
        amount: pick.amount + (mo * 3 + i * 2) % 17,
        day: 3 + (i * 5 + mo * 2) % 24,
        monthOffset: mo,
      });
    }
    rows.push({
      desc: 'Rent — apartment',
      category: 'Rent',
      amount: 1650 + (mo % 2) * 25,
      day: 1,
      monthOffset: mo,
    });
    rows.push({
      desc: 'Planet Fitness',
      category: 'Fitness',
      amount: 29.99,
      day: 8,
      monthOffset: mo,
    });
    rows.push({
      desc: 'Apple Store — accessory',
      category: 'Technology',
      amount: 79 + mo * 10,
      day: 14,
      monthOffset: mo,
    });
  }

  // Extra density in current month for “latest transactions” + top categories
  for (let extra = 0; extra < 12; extra++) {
    rows.push({
      desc: dining[extra % dining.length].desc,
      category: 'Restaurants',
      amount: 18 + extra * 4,
      day: 2 + extra * 2,
      monthOffset: 0,
    });
  }

  return rows;
}

async function main() {
  const { clerkUserId, userId: cliUserId } = parseCli();

  const user =
    cliUserId != null && !Number.isNaN(cliUserId)
      ? await prisma.user.findUnique({ where: { id: cliUserId } })
      : clerkUserId
        ? await prisma.user.findUnique({ where: { clerkUserId } })
        : null;

  if (!user) {
    console.error(
      'No user found. Pass --clerk-user-id=... or --user-id=... (or DEMO_SEED_* env). User must already exist in the database.',
    );
    process.exit(1);
  }

  const userId = user.id;
  console.log(`Seeding demo data for user id=${userId} clerkUserId=${user.clerkUserId ?? '(null)'}`);

  const [usd, english] = await Promise.all([
    prisma.currency.findFirst({ where: { alias: { equals: 'USD', mode: 'insensitive' } } }),
    prisma.language.findFirst({ where: { alias: { equals: 'en', mode: 'insensitive' } } }),
  ]);

  if (!usd) {
    console.error('USD currency not found. Run `npm run seed` first.');
    process.exit(1);
  }

  const categories = await prisma.category.findMany();
  const catByName: CatMap = new Map(categories.map((c) => [c.name, c.id]));

  const requireCat = (name: string) => {
    const id = catByName.get(name);
    if (id == null) throw new Error(`Missing category "${name}" — run main seed.`);
    return id;
  };

  await wipeUserScopedData(userId);

  await prisma.user.update({
    where: { id: userId },
    data: {
      profession: user.profession ?? 'Product Designer',
      country: user.country ?? 'United States',
      dateOfBirth: user.dateOfBirth ?? new Date('1992-06-15'),
      languageId: english?.id ?? user.languageId,
      currencyId: usd.id,
      incomeTaxRate: 22,
      dataSharingEnabled: false,
    },
  });

  await prisma.userNotificationSettings.upsert({
    where: { userId },
    create: {
      userId,
      pushNotifications: true,
      upcomingBills: true,
      upcomingIncome: true,
      investments: true,
      goals: true,
      promotionalEmail: false,
      aiInsights: true,
    },
    update: {},
  });


  await prisma.merchant.createMany({
    data: [
      { userId, namePattern: 'blue bottle coffee', categoryId: requireCat('Restaurants'), matchCount: 6 },
      { userId, namePattern: 'whole foods', categoryId: requireCat('Groceries'), matchCount: 14 },
    ],
    skipDuplicates: true,
  });

  const now = new Date();
  const anchor = now;

  const incomeRows: Prisma.TransactionCreateManyInput[] = [];
  for (let mo = 0; mo < 5; mo++) {
    incomeRows.push({
      userId,
      type: 'income',
      amount: 4850,
      description: 'Acme Corp — salary',
      source: 'manual',
      date: dateInMonth(anchor, mo, 1, 9),
      categoryId: requireCat('Salary'),
      currencyId: usd.id,
    });
    incomeRows.push({
      userId,
      type: 'income',
      amount: 4850,
      description: 'Acme Corp — salary',
      source: 'manual',
      date: dateInMonth(anchor, mo, 15, 9),
      categoryId: requireCat('Salary'),
      currencyId: usd.id,
    });
    incomeRows.push({
      userId,
      type: 'income',
      amount: 620 + mo * 40,
      description: 'Design sprint — client invoice',
      source: 'manual',
      date: dateInMonth(anchor, mo, 22, 11),
      categoryId: requireCat('Freelance'),
      currencyId: usd.id,
    });
    incomeRows.push({
      userId,
      type: 'income',
      amount: 38 + mo * 5,
      description: 'Amazon refund — order #8821',
      source: 'manual',
      date: dateInMonth(anchor, mo, 11, 14),
      categoryId: requireCat('Refunds'),
      currencyId: usd.id,
    });
  }

  const expenseTemplates = buildExpenseTemplates();
  const expenseRows: Prisma.TransactionCreateManyInput[] = expenseTemplates.map((t) => ({
    userId,
    type: 'expense',
    amount: t.amount,
    description: t.desc,
    source: 'manual',
    date: dateInMonth(anchor, t.monthOffset, t.day),
    categoryId: requireCat(t.category),
    currencyId: usd.id,
  }));

  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  for (const batch of chunk([...incomeRows, ...expenseRows], 80)) {
    await prisma.transaction.createMany({ data: batch });
  }

  const { ensureAsset } = await import('../src/lib/assets');

  type Holding = {
    name: string;
    ticker: string | null;
    assetType: AssetType;
    pricingMode: PricingMode;
    qty: number;
    buyPrice: number;
    date: Date;
    coingeckoId?: string;
    icon?: string;
  };

  const holdings: Holding[] = [
    {
      name: 'Bitcoin',
      ticker: 'BTC',
      assetType: 'crypto',
      pricingMode: 'live',
      qty: 0.42,
      buyPrice: 61200,
      date: dateInMonth(anchor, 4, 10),
      coingeckoId: 'bitcoin',
    },
    {
      name: 'Ethereum',
      ticker: 'ETH',
      assetType: 'crypto',
      pricingMode: 'live',
      qty: 3.2,
      buyPrice: 2850,
      date: dateInMonth(anchor, 3, 8),
      coingeckoId: 'ethereum',
    },
    {
      name: 'NVIDIA',
      ticker: 'NVDA',
      assetType: 'stock',
      pricingMode: 'live',
      qty: 12,
      buyPrice: 118,
      date: dateInMonth(anchor, 2, 5),
    },
    {
      name: 'Apple',
      ticker: 'AAPL',
      assetType: 'stock',
      pricingMode: 'live',
      qty: 25,
      buyPrice: 189,
      date: dateInMonth(anchor, 1, 12),
    },
    {
      name: 'Mountain cabin (equity)',
      ticker: null,
      assetType: 'property',
      pricingMode: 'manual',
      qty: 1,
      buyPrice: 185000,
      date: dateInMonth(anchor, 4, 20),
      icon: 'Neighbourhood',
    },
  ];

  for (const inv of holdings) {
    const isPrivate =
      inv.assetType === 'property' || inv.assetType === 'custom' || inv.assetType === 'other';
    const assetUserId = isPrivate ? userId : undefined;

    const asset = await ensureAsset(
      inv.ticker,
      inv.name,
      inv.assetType,
      inv.pricingMode,
      inv.coingeckoId,
      assetUserId,
      inv.icon,
    );
    if (inv.pricingMode === 'manual') {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { manualPrice: new Prisma.Decimal(198000) },
      });
    }

    await prisma.transaction.create({
      data: {
        userId,
        type: 'expense',
        amount: 0,
        description: `Buy ${inv.qty} ${inv.ticker ?? inv.name}`,
        source: 'manual',
        date: inv.date,
        currencyId: usd.id,
        investmentAssetId: asset.id,
        investmentType: InvestmentType.buy,
        quantity: new Prisma.Decimal(inv.qty),
        pricePerUnit: new Prisma.Decimal(inv.buyPrice),
      },
    });
  }

  const btcAsset = await prisma.asset.findFirst({
    where: { ticker: { equals: 'BTC', mode: 'insensitive' }, userId: null, assetType: 'crypto' },
  });
  if (btcAsset) {
    await prisma.transaction.create({
      data: {
        userId,
        type: 'expense',
        amount: 0,
        description: 'Sell BTC — took partial profits',
        source: 'manual',
        date: dateInMonth(anchor, 1, 18, 15),
        currencyId: usd.id,
        investmentAssetId: btcAsset.id,
        investmentType: InvestmentType.sell,
        quantity: new Prisma.Decimal(0.08),
        pricePerUnit: new Prisma.Decimal(70200),
      },
    });
  }

  const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 12, 0, 0, 0);
  const daysFrom = (n: number) => {
    const x = new Date(now);
    x.setDate(x.getDate() + n);
    x.setHours(12, 0, 0, 0);
    return x;
  };

  await prisma.recurringTransaction.createMany({
    data: [
      {
        userId,
        type: RecurringType.expense,
        name: 'Apartment rent',
        amount: 1650,
        currencyId: usd.id,
        categoryId: requireCat('Rent'),
        startDate: dateInMonth(anchor, 8, 1),
        nextDueDate: firstOfNextMonth,
        frequencyUnit: FrequencyUnit.month,
        frequencyInterval: 1,
        isActive: true,
      },
      {
        userId,
        type: RecurringType.expense,
        name: 'Netflix',
        amount: 15.49,
        currencyId: usd.id,
        categoryId: requireCat('Subscriptions'),
        startDate: dateInMonth(anchor, 6, 3),
        nextDueDate: daysFrom(3),
        frequencyUnit: FrequencyUnit.month,
        frequencyInterval: 1,
        isActive: true,
      },
      {
        userId,
        type: RecurringType.expense,
        name: 'Planet Fitness',
        amount: 29.99,
        currencyId: usd.id,
        categoryId: requireCat('Fitness'),
        startDate: dateInMonth(anchor, 5, 5),
        nextDueDate: daysFrom(14),
        frequencyUnit: FrequencyUnit.month,
        frequencyInterval: 1,
        isActive: true,
      },
      {
        userId,
        type: RecurringType.expense,
        name: 'Car insurance',
        amount: 128,
        currencyId: usd.id,
        categoryId: requireCat('Taxes'),
        startDate: dateInMonth(anchor, 4, 12),
        nextDueDate: daysFrom(5),
        frequencyUnit: FrequencyUnit.month,
        frequencyInterval: 1,
        isActive: true,
      },
      {
        userId,
        type: RecurringType.expense,
        name: 'Adobe CC (paused)',
        amount: 59.99,
        currencyId: usd.id,
        categoryId: requireCat('Subscriptions'),
        startDate: dateInMonth(anchor, 3, 1),
        nextDueDate: daysFrom(20),
        frequencyUnit: FrequencyUnit.month,
        frequencyInterval: 1,
        isActive: false,
      },
      {
        userId,
        type: RecurringType.income,
        name: 'Side project retainer',
        amount: 1200,
        currencyId: usd.id,
        categoryId: requireCat('Freelance'),
        startDate: dateInMonth(anchor, 4, 1),
        nextDueDate: (() => {
          const t = new Date(now.getFullYear(), now.getMonth(), 25, 12, 0, 0, 0);
          if (t <= now) t.setMonth(t.getMonth() + 1);
          return t;
        })(),
        frequencyUnit: FrequencyUnit.month,
        frequencyInterval: 1,
        isActive: true,
      },
    ],
  });

  const goalSpecs = [
    { name: 'Emergency fund', target: 24000, current: 16200, monthsToTarget: 8 },
    { name: 'Japan trip fund', target: 8500, current: 3920, monthsToTarget: 10 },
    { name: 'MacBook Pro upgrade', target: 3200, current: 1480, monthsToTarget: 5 },
    { name: 'House down payment', target: 85000, current: 31200, monthsToTarget: 36 },
  ];

  for (const g of goalSpecs) {
    const targetDate = addMonths(now, g.monthsToTarget);
    await prisma.goal.create({
      data: {
        userId,
        name: g.name,
        targetAmount: g.target,
        currentAmount: g.current,
        targetDate,
        currencyId: usd.id,
      },
    });
  }

  const notifTime = '09:30';
  await prisma.notification.createMany({
    data: [
      {
        userId,
        type: 'Goal Update',
        text: "You're on track for your Emergency fund goal this month.",
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10, 0),
        time: notifTime,
        read: false,
      },
      {
        userId,
        type: 'Upcoming Bills',
        text: 'Rent and three subscriptions are due in the next 10 days.',
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 14, 0),
        time: notifTime,
        read: false,
      },
      {
        userId,
        type: 'Investments',
        text: 'Portfolio value moved this week — review your allocation.',
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 11, 0),
        time: notifTime,
        read: true,
      },
      {
        userId,
        type: 'AI Insights',
        text: 'Your savings rate improved vs last month. Keep the streak.',
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5, 8, 0),
        time: notifTime,
        read: true,
      },
      {
        userId,
        type: 'Upcoming Income',
        text: 'Freelance retainer is expected on the 25th.',
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 16, 0),
        time: notifTime,
        read: true,
      },
    ],
  });

  await prisma.feedback.create({
    data: {
      userId,
      email: 'demo-feedback@example.com',
      category: 'Product idea',
      message:
        'Seeded message: love the dashboard. Would be great to export goals to CSV.',
    },
  });

  let approxValue = 95000;
  let approxCost = 78000;
  for (let i = 29; i >= 0; i--) {
    const ts = new Date(now);
    ts.setDate(ts.getDate() - i);
    ts.setHours(23, 0, 0, 0);
    approxValue += 180 + (i % 7) * 40;
    approxCost += 95;
    const pnl = approxValue - approxCost;
    await prisma.portfolioSnapshot.create({
      data: {
        userId,
        totalValue: approxValue,
        totalCost: approxCost,
        totalPnl: pnl,
        timestamp: ts,
      },
    });
  }

  console.log('Done. Summary:');
  console.log(`  • Cash transactions: ${incomeRows.length + expenseRows.length}`);
  console.log(`  • Investment lots + 1 partial BTC sell`);
  console.log(`  • Recurring items: 6 (5 expense, 1 income)`);
  console.log(`  • Goals: ${goalSpecs.length}`);
  console.log(`  • Notifications: 5, portfolio snapshots: 30 days`);
  console.log('  • User profile + notification settings updated (USD, English).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
