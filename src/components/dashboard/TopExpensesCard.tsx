import Card from '@/components/ui/Card';
import DonutChart from '@/components/ui/DonutChart';
import { ExpenseCategory } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { formatNumber } from '@/lib/utils';

interface TopExpensesCardProps {
  expenses: ExpenseCategory[];
}

export default function TopExpensesCard({ expenses }: TopExpensesCardProps) {
  const chartData = expenses.map(exp => ({
    name: exp.name,
    value: exp.percentage,
    color: exp.color,
  }));

  return (
    <Card title="Top Expenses">
      <div className="mt-2">
        <DonutChart data={chartData} />
        <div className="space-y-3 mt-4">
          {expenses.map((expense) => {
            const Icon = getIcon(expense.icon);
            return (
              <div key={expense.id} className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <Icon width={24} height={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 text-body font-medium">{expense.name}</div>
                <div className="text-body font-semibold">
                  ${formatNumber(expense.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

