import { RecurringItem, Transaction, Category } from '@/types/dashboard';
import { formatDateForDisplay } from '@/lib/dateFormatting';

/**
 * Build a Transaction shape from a RecurringItem for use in TransactionModal (edit recurring).
 */
export function buildTransactionFromRecurring(
  item: RecurringItem,
  categories: Category[]
): Transaction {
  const amount =
    item.type === 'expense'
      ? -(item.convertedAmount ?? item.amount)
      : (item.convertedAmount ?? item.amount);
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
