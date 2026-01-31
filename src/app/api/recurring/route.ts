import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUserWithLanguage } from '@/lib/auth';
import { db } from '@/lib/db';
import { convertAmount } from '@/lib/currency-conversion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RecurringType = 'income' | 'expense';
type FrequencyUnit = 'day' | 'week' | 'month' | 'year';

interface RecurringPayload {
  id?: number;
  name: string;
  amount: number;
  currencyId?: number;
  category?: string | null;
  type: RecurringType;
  startDate: string; // ISO date string
  endDate?: string | null;
  frequencyUnit: FrequencyUnit;
  frequencyInterval: number;
  createInitial?: boolean;
  isActive?: boolean;
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                 day === 2 || day === 22 ? 'nd' :
                 day === 3 || day === 23 ? 'rd' : 'th';

  return `${month} ${day}${suffix} ${year}`;
}

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

function addInterval(date: Date, unit: FrequencyUnit, interval: number): Date {
  const next = new Date(date);
  switch (unit) {
    case 'day':
      next.setDate(next.getDate() + interval);
      break;
    case 'week':
      next.setDate(next.getDate() + interval * 7);
      break;
    case 'month':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'year':
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      break;
  }
  return next;
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

async function processDueRecurringItems(userId: number, now: Date) {
  const dueItems = await db.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      nextDueDate: { lte: now },
    },
    include: {
      category: true,
    },
  });

  for (const item of dueItems) {
    let iterations = 0;
    let nextDate = new Date(item.nextDueDate);

    while (nextDate <= now && iterations < 24) {
      // Respect endDate
      if (item.endDate && nextDate > item.endDate) {
        await db.recurringTransaction.update({
          where: { id: item.id },
          data: { isActive: false },
        });
        break;
      }

      // Create the real transaction
      await db.transaction.create({
        data: {
          userId: item.userId,
          type: item.type,
          amount: item.amount,
          description: item.name,
          date: nextDate,
          categoryId: item.categoryId ?? undefined,
          currencyId: item.currencyId,
        },
      });

      const following = addInterval(nextDate, item.frequencyUnit, item.frequencyInterval);

      await db.recurringTransaction.update({
        where: { id: item.id },
        data: {
          lastGeneratedAt: nextDate,
          nextDueDate: following,
          updatedAt: new Date(),
        },
      });

      nextDate = following;
      iterations += 1;
    }
  }
}

function serializeUpcoming(
  items: Array<{
    id: number;
    name: string;
    amount: number;
    type: RecurringType;
    category?: { name: string | null } | null;
    nextDueDate: Date;
    convertedAmount?: number;
  }>,
): Array<{
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string | null;
  type: RecurringType;
  icon: string;
}> {
  return items
    .filter(item => item.nextDueDate)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
    .map(item => ({
      id: item.id.toString(),
      name: item.name,
      amount: item.convertedAmount ?? item.amount,
      date: formatDate(new Date(item.nextDueDate)),
      category: item.category?.name ?? null,
      type: item.type,
      icon: getIconForCategory(item.category?.name ?? null),
    }));
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUserWithLanguage();
    const now = new Date();
    const userCurrencyId = await getUserCurrencyId(user.currencyId ?? undefined);

    // Generate due transactions before returning data
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

    const itemsWithConversion = await Promise.all(
      items.map(async (item) => {
        const convertedAmount = await convertAmount(
          item.amount,
          item.currencyId,
          userCurrencyId,
          item.nextDueDate,
        );

        return { ...item, convertedAmount };
      }),
    );

    const upcoming = serializeUpcoming(
      itemsWithConversion.filter((item) => item.isActive && item.nextDueDate),
    );

    if (onlyUpcoming) {
      return NextResponse.json({ upcoming });
    }

    return NextResponse.json({
      items: itemsWithConversion.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        amount: item.amount,
        convertedAmount: item.convertedAmount,
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
    });
  } catch (error) {
    console.error('[recurring][GET] failed', error);
    return NextResponse.json(
      { error: 'Failed to fetch recurring items' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUserWithLanguage();
    const body = (await request.json()) as RecurringPayload;

    if (!body.name || !body.amount || !body.startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: name, amount, startDate' },
        { status: 400 },
      );
    }

    const currencyId = body.currencyId ?? await getUserCurrencyId(user.currencyId ?? undefined);
    const categoryId = await resolveCategoryId(user.id, body.category);

    const startDate = new Date(body.startDate);
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
    }

    const nextDueDate = new Date(startDate);
    const endDate = body.endDate ? new Date(body.endDate) : null;

    const newItem = await db.recurringTransaction.create({
      data: {
        userId: user.id,
        type: body.type === 'income' ? 'income' : 'expense',
        name: body.name,
        amount: Math.abs(body.amount),
        currencyId,
        categoryId,
        startDate,
        nextDueDate,
        endDate: endDate ?? undefined,
        frequencyUnit: body.frequencyUnit || 'month',
        frequencyInterval: body.frequencyInterval || 1,
      },
    });

    if (body.createInitial) {
      await processDueRecurringItems(user.id, new Date());
    }

    return NextResponse.json({ id: newItem.id });
  } catch (error) {
    console.error('[recurring][POST] failed', error);
    return NextResponse.json(
      { error: 'Failed to create recurring item' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireCurrentUserWithLanguage();
    const body = (await request.json()) as RecurringPayload;

    if (!body.id) {
      return NextResponse.json(
        { error: 'Missing recurring item id' },
        { status: 400 },
      );
    }

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

    const startDate = body.startDate ? new Date(body.startDate) : existing.startDate;
    const endDate = body.endDate ? new Date(body.endDate) : existing.endDate;
    const nextDueDate = startDate && startDate <= existing.nextDueDate ? existing.nextDueDate : startDate;

    const isActive =
      body.isActive !== undefined
        ? body.isActive
        : body.endDate && endDate && endDate < new Date()
          ? false
          : existing.isActive;

    await db.recurringTransaction.update({
      where: { id: existing.id },
      data: {
        name: body.name ?? existing.name,
        amount: body.amount ? Math.abs(body.amount) : existing.amount,
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
    console.error('[recurring][PUT] failed', error);
    return NextResponse.json(
      { error: 'Failed to update recurring item' },
      { status: 500 },
    );
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

    await db.recurringTransaction.delete({ where: { id: existing.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[recurring][DELETE] failed', error);
    return NextResponse.json(
      { error: 'Failed to delete recurring item' },
      { status: 500 },
    );
  }
}

