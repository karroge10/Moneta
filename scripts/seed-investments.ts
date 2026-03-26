import {
  PrismaClient,
  AssetType,
  PricingMode,
  InvestmentType,
  Prisma,
} from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), '.env') });
}

const prisma = new PrismaClient();

type SeedHolding = {
  name: string;
  ticker: string | null;
  assetType: AssetType;
  pricingMode: PricingMode;
  quantity: number;
  purchasePrice: number;
  currentValue: number;
  icon: string;
  purchaseDate: Date;
  coingeckoId?: string;
};

async function main() {
  const { ensureAsset } = await import('../src/lib/assets');

  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No users found in database. Please sign up first.');
    return;
  }

  const userId = user.id;
  console.log(`Using user: ${user.userName || user.clerkUserId} (ID: ${userId})`);

  const usd =
    (user.currencyId &&
      (await prisma.currency.findUnique({ where: { id: user.currencyId } }))) ||
    (await prisma.currency.findFirst({ where: { alias: 'USD' } }));
  if (!usd) {
    console.error('No currency found for user / USD missing.');
    return;
  }

  await prisma.transaction.deleteMany({
    where: { userId, investmentAssetId: { not: null } },
  });
  await prisma.asset.deleteMany({ where: { userId } });

  const holdings: SeedHolding[] = [
    {
      name: 'Bitcoin',
      ticker: 'BTC',
      assetType: 'crypto',
      pricingMode: 'live',
      quantity: 0.52,
      purchasePrice: 42000,
      currentValue: 52000,
      icon: 'BitcoinCircle',
      purchaseDate: new Date('2023-10-15'),
    },
    {
      name: 'Ethereum',
      ticker: 'ETH',
      assetType: 'crypto',
      pricingMode: 'live',
      quantity: 4.5,
      purchasePrice: 2100,
      currentValue: 12150,
      icon: 'BitcoinCircle',
      purchaseDate: new Date('2023-11-20'),
    },
    {
      name: 'NVIDIA',
      ticker: 'NVDA',
      assetType: 'stock',
      pricingMode: 'live',
      quantity: 15,
      purchasePrice: 450,
      currentValue: 18000,
      icon: 'Cash',
      purchaseDate: new Date('2023-12-05'),
    },
    {
      name: 'Apple',
      ticker: 'AAPL',
      assetType: 'stock',
      pricingMode: 'live',
      quantity: 10,
      purchasePrice: 175,
      currentValue: 1900,
      icon: 'Cash',
      purchaseDate: new Date('2024-01-10'),
    },
    {
      name: 'Tbilisi Apartment',
      ticker: null,
      assetType: 'property',
      pricingMode: 'manual',
      quantity: 1,
      purchasePrice: 85000,
      currentValue: 92000,
      icon: 'Neighbourhood',
      purchaseDate: new Date('2022-05-20'),
    },
  ];

  console.log('Seeding investments (assets + buy transactions)...');

  for (const inv of holdings) {
    const isPrivate =
      inv.assetType === 'property' ||
      inv.assetType === 'custom' ||
      inv.assetType === 'other';
    const assetUserId = isPrivate ? userId : undefined;

    const asset = await ensureAsset(
      inv.ticker,
      inv.name,
      inv.assetType,
      inv.pricingMode,
      inv.coingeckoId,
      assetUserId,
      inv.icon
    );

    if (inv.pricingMode === 'manual') {
      await prisma.asset.update({
        where: { id: asset.id },
        data: { manualPrice: new Prisma.Decimal(inv.currentValue) },
      });
    }

    await prisma.transaction.create({
      data: {
        userId,
        type: 'expense',
        amount: 0,
        description: `Bought ${inv.quantity} ${inv.ticker || inv.name}`,
        date: inv.purchaseDate,
        currencyId: usd.id,
        investmentAssetId: asset.id,
        investmentType: InvestmentType.buy,
        quantity: new Prisma.Decimal(inv.quantity),
        pricePerUnit: new Prisma.Decimal(inv.purchasePrice),
      },
    });
  }

  console.log('Done seeding investments!');
}

main()
  .catch((e) => {
    console.error('Seed failed:');
    console.error(e);
  })
  .finally(() => prisma.$disconnect());
