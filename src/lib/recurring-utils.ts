import { RecurringItem, Transaction, Category } from '@/types/dashboard';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import { addUtcDays, addUtcMonths } from '@/lib/dates';

type RecurrenceUnit = 'day' | 'week' | 'month' | 'year';


export function buildTransactionFromRecurring(
  item: RecurringItem,
  categories: Category[]
): Transaction {
  // The form saves with item.currencyId, so the amount must stay in that currency, not the converted one.
  const amount = item.type === 'expense' ? -item.amount : item.amount;
  const categoryObj = categories.find((c) => c.name === item.category);
  return {
    id: `recurring-${item.id}`,
    name: item.name,
    date: formatDateForDisplay(item.nextDueDate),
    dateRaw: item.nextDueDate.slice(0, 10),
    amount,
    category: item.category,
    icon: categoryObj?.icon ?? 'HelpCircle',
    currencyId: item.currencyId,
    recurringId: item.id,
    recurring: {
      isRecurring: true,
      startDate: item.startDate,
      endDate: item.endDate ?? null,
      frequencyUnit: item.frequencyUnit,
      frequencyInterval: item.frequencyInterval,
      type: item.type,
      isActive: item.isActive,
    },
  };
}

/**
 * Next occurrence after `from`, in UTC. Months and years clamp to the last day of the target month
 * (Jan 31 + 1 month = Feb 28/29) instead of overflowing into the following month.
 */
export function computeNextDueDate(from: Date, unit: RecurrenceUnit, interval: number): Date {
  switch (unit) {
    case 'day':
      return addUtcDays(from, interval);
    case 'week':
      return addUtcDays(from, interval * 7);
    case 'month':
      return addUtcMonths(from, interval);
    case 'year':
      return addUtcMonths(from, interval * 12);
  }
}
