import type { Bill, Category, RecurringItem } from '@/types/dashboard';
import { formatDateForDisplay } from '@/lib/dateFormatting';

/** Recurring items with a next due date, soonest first, shaped for UpcomingRecurringCard. */
export function toUpcomingItems(items: RecurringItem[], categories: Category[]): Bill[] {
  const due = items.filter((item) => item.nextDueDate);
  const sorted = due.sort((a, b) => Date.parse(a.nextDueDate) - Date.parse(b.nextDueDate));
  return sorted.map((item) => ({
    id: String(item.id),
    name: item.name,
    date: formatDateForDisplay(item.nextDueDate),
    amount: item.convertedAmount ?? item.amount,
    category: item.category ?? 'Uncategorized',
    icon: categories.find((c) => c.name === item.category)?.icon ?? 'HelpCircle',
    isActive: item.isActive,
  }));
}
