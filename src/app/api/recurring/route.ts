import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { moneyToNumber, parseMoney, type MoneyValue } from '@/lib/money';
import { preloadRates, convertTransactionsWithRatesMap, countMissingRates } from '@/lib/currency-conversion';
import { processDueRecurringItems } from '@/lib/recurring-core';
import { formatDisplayDate, parseDisplayDate } from '@/lib/transaction-utils';
import { parseJsonBody, recurringCreateSchema, recurringUpdateSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RecurringType = 'income' | 'expense';
function getIconForCategory(categoryName: string | null): string {
  if (!categoryName) return 'HelpCircle';

  const iconMap: Record<string, string> = {
    'Rent': 'City',
    'Entertainment': 'Tv',
    'Restaurants': 'PizzaSlice',
    'Furniture': 'Sofa',
    'Groceries': 'Cart',
    'Gifts': 'Gift',
    'Fitness': 'Gym',
    'Water Bill': 'Droplet',
    'Technology': 'Tv',
    'Electricity Bill': 'Flash',
    'Clothes': 'Shirt',
    'Transportation': 'Tram',
    'Heating Bill': 'FireFlame',
    'Home Internet': 'Wifi',
    'Taxes': 'Cash',
    'Mobile Data': 'SmartphoneDevice',
    'Salary': 'Suitcase',
    'Freelance': 'Globe',
    'Investment': 'BitcoinCircle',
    'Gift': 'Gift',
  };

  return iconMap[categoryName] || 'HelpCircle';
}

async function resolveCategoryId(userId: number, categoryName?: string | null): Promise<number | null> {
  if (!categoryName) return null;
  const category = await db.category.findFirst({
    where: {
      name: { equals: categoryName, mode: 'insensitive' },
    },
  });
  return category?.id ?? null;
}

async function getUserCurrencyId(userCurrencyId?: number): Promise<number> {
  const currency = userCurrencyId
    ? await db.currency.findUnique({ where: { id: userCurrencyId } })
    : await db.currency.findFirst();

  if (!currency) {
    throw new Error('No currency configured.');
  }

  return currency.id;
}


function serializeUpcoming(
  items: Array<{
    id: number;
    name: string;
    amount: MoneyValue;
    type: RecurringType;
    category?: { name: string | null } | null;
    nextDueDate: Date;
    convertedAmount: number;
    rateMissing: boolean;
  }>,
): Array<{
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string | null;
  type: RecurringType;
  icon: string;
  rateMissing: boolean;
}> {
  return items
    .filter(item => item.nextDueDate)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
    .map(item => ({
      id: item.id.toString(),
      name: item.name,
      amount: item.convertedAmount,
      date: formatDisplayDate(item.nextDueDate),
      category: item.category?.name ?? null,
      type: item.type,
      icon: getIconForCategory(item.category?.name ?? null),
      rateMissing: item.rateMissing,
    }));
}


export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUserWithLanguage();
    const now = new Date();
    const userCurrencyId = await getUserCurrencyId(user.currencyId ?? undefined);

    
    await processDueRecurringItems(user.id, now);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as RecurringType | null;
    const onlyUpcoming = searchParams.get('upcoming') === 'true';

    const whereClause: Record<string, unknown> = {
      userId: user.id,
    };

    if (type === 'income' || type === 'expense') {
      whereClause.type = type;
    }

    const items = await db.recurringTransaction.findMany({
      where: whereClause,
      include: {
        category: true,
        currency: true,
      },
      orderBy: { nextDueDate: 'asc' },
    });

    const rateRequests = items.map((t) => ({ currencyId: t.currencyId, date: t.nextDueDate }));
    const ratesMap = await preloadRates(rateRequests, userCurrencyId);

    const itemsWithConversion = convertTransactionsWithRatesMap(
      items.map(item => ({
        ...item,
        date: item.nextDueDate,
      })),
      userCurrencyId,
      ratesMap
    );

    const activeItems = itemsWithConversion.filter((item) => item.isActive);
    const upcoming = serializeUpcoming(activeItems);

    if (onlyUpcoming) {
      const missingRates = countMissingRates(activeItems);
      return NextResponse.json({ upcoming, missingRates });
    }

    return NextResponse.json({
      items: itemsWithConversion.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        amount: moneyToNumber(item.amount),
        convertedAmount: item.convertedMoney ? moneyToNumber(item.convertedMoney) : null,
        rateMissing: item.rateMissing,
        currencyId: item.currencyId,
        category: item.category?.name ?? null,
        startDate: item.startDate,
        nextDueDate: item.nextDueDate,
        endDate: item.endDate,
        isActive: item.isActive,
        frequencyUnit: item.frequencyUnit,
        frequencyInterval: item.frequencyInterval,
        lastGeneratedAt: item.lastGeneratedAt,
      })),
      upcoming,
      missingRates: countMissingRates(itemsWithConversion),
    });
  } catch (error) {
    return errorResponse(error, '[recurring][GET] failed', 'Failed to fetch recurring items');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUserWithLanguage();
    const parsed = await parseJsonBody(request, recurringCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const amount = parseMoney(body.amount)!;

    if (amount.isZero()) {
      return NextResponse.json({ error: 'Amount must not be zero' }, { status: 400 });
    }

    const currencyId = body.currencyId ?? await getUserCurrencyId(user.currencyId ?? undefined);
    const categoryId = await resolveCategoryId(user.id, body.category);

    const startDate = parseDisplayDate(body.startDate)!;
    const nextDueDate = new Date(startDate);
    const endDate = body.endDate ? parseDisplayDate(body.endDate) : null;

    const newItem = await db.recurringTransaction.create({
      data: {
        userId: user.id,
        type: body.type,
        name: body.name,
        amount: amount.abs(),
        currencyId,
        categoryId,
        startDate,
        nextDueDate,
        endDate: endDate ?? undefined,
        frequencyUnit: body.frequencyUnit || 'month',
        frequencyInterval: body.frequencyInterval || 1,
      },
    });

    
    
    if (body.createInitial && startDate <= new Date()) {
      await processDueRecurringItems(user.id, new Date());
    }

    return NextResponse.json({ id: newItem.id });
  } catch (error) {
    return errorResponse(error, '[recurring][POST] failed', 'Failed to create recurring item');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireCurrentUserWithLanguage();
    const parsed = await parseJsonBody(request, recurringUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const updatedAmount = body.amount !== undefined ? parseMoney(body.amount) : null;

    const existing = await db.recurringTransaction.findFirst({
      where: { id: body.id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Recurring item not found' }, { status: 404 });
    }

    const currencyId = body.currencyId ?? existing.currencyId ?? await getUserCurrencyId(user.currencyId ?? undefined);
    const categoryId =
      body.category !== undefined
        ? await resolveCategoryId(user.id, body.category)
        : existing.categoryId;

    const startDate = body.startDate ? parseDisplayDate(body.startDate)! : existing.startDate;
    const endDate = body.endDate ? parseDisplayDate(body.endDate) : existing.endDate;
    const nextDueDate = startDate && startDate <= existing.nextDueDate ? existing.nextDueDate : startDate;

    const isActive =
      body.isActive !== undefined
        ? body.isActive
        : body.endDate && endDate && endDate < new Date()
          ? false
          : existing.isActive;

    await db.recurringTransaction.update({
      where: { id: existing.id, userId: user.id },
      data: {
        name: body.name ?? existing.name,
        amount: updatedAmount && !updatedAmount.isZero() ? updatedAmount.abs() : existing.amount,
        type: body.type ?? existing.type,
        currencyId,
        categoryId,
        startDate,
        endDate: endDate ?? undefined,
        nextDueDate: nextDueDate ?? existing.nextDueDate,
        frequencyUnit: body.frequencyUnit ?? existing.frequencyUnit,
        frequencyInterval: body.frequencyInterval ?? existing.frequencyInterval,
        isActive,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, '[recurring][PUT] failed', 'Failed to update recurring item');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCurrentUserWithLanguage();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing recurring item id' },
        { status: 400 },
      );
    }

    const existing = await db.recurringTransaction.findFirst({
      where: { id: Number(id), userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Recurring item not found' }, { status: 404 });
    }

    await db.recurringTransaction.delete({ where: { id: existing.id, userId: user.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, '[recurring][DELETE] failed', 'Failed to delete recurring item');
  }
}

