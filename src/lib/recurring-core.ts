import { db } from '@/lib/db';
import { preloadRatesMap, convertTransactionsWithRatesMap } from '@/lib/currency-conversion';
import { Transaction as PrismaTransaction } from '@prisma/client';

export async function processDueRecurringItems(userId: number, now: Date) {
  const items = await db.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      nextDueDate: { lte: now },
    },
  });

  if (items.length === 0) return [];

  const newTransactions: PrismaTransaction[] = [];

  for (const item of items) {
    
    const transaction = await db.transaction.create({
      data: {
        userId,
        description: item.name,
        amount: item.amount,
        type: item.type,
        currencyId: item.currencyId,
        categoryId: item.categoryId ?? null,
        date: item.nextDueDate,
      },
    });

    newTransactions.push(transaction);

    
    const nextDate = new Date(item.nextDueDate);
    if (item.frequencyUnit === 'day') {
      nextDate.setDate(nextDate.getDate() + item.frequencyInterval);
    } else if (item.frequencyUnit === 'week') {
      nextDate.setDate(nextDate.getDate() + item.frequencyInterval * 7);
    } else if (item.frequencyUnit === 'month') {
      nextDate.setMonth(nextDate.getMonth() + item.frequencyInterval);
    } else if (item.frequencyUnit === 'year') {
      nextDate.setFullYear(nextDate.getFullYear() + item.frequencyInterval);
    }

    await db.recurringTransaction.update({
      where: { id: item.id },
      data: {
        nextDueDate: nextDate,
        lastGeneratedAt: item.nextDueDate,
      },
    });
  }

  return newTransactions;
}

export async function getExpenseRecurringItemsSerialized(userId: number, targetCurrencyId: number) {
  const items = await db.recurringTransaction.findMany({
    where: {
      userId,
      type: 'expense',
    },
    include: {
      category: true,
    },
  });

  if (items.length === 0) return [];

  
  const validItems = items.filter(item => item.nextDueDate);
  
  const ratesMap = await preloadRatesMap(
    validItems.map(item => ({ currencyId: item.currencyId, date: item.nextDueDate! })),
    targetCurrencyId
  );

  return convertTransactionsWithRatesMap(
    validItems.map(item => ({
      ...item,
      id: item.id as any, 
      date: item.nextDueDate!,
      amount: Number(item.amount),
    })),
    targetCurrencyId,
    ratesMap
  ).map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    amount: item.amount,
    convertedAmount: item.convertedAmount,
    currencyId: item.currencyId,
    category: item.category?.name ?? null,
    startDate: item.startDate.toISOString(),
    nextDueDate: item.nextDueDate.toISOString(),
    endDate: item.endDate?.toISOString() ?? null,
    isActive: item.isActive,
    frequencyUnit: item.frequencyUnit,
    frequencyInterval: item.frequencyInterval,
    lastGeneratedAt: item.lastGeneratedAt?.toISOString() ?? null,
  }));
}

