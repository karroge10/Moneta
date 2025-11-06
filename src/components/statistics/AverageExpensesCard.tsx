import Card from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import { getIcon } from '@/lib/iconMapping';

interface AverageExpense {
  id: string;
  name: string;
  amount: number;
  icon: string;
  color: string;
}

interface AverageExpensesCardProps {
  expenses: AverageExpense[];
}

export default function AverageExpensesCard({ expenses }: AverageExpensesCardProps) {
  return (
    <Card title="Average Expenses">
      <div className="overflow-y-auto custom-scrollbar mt-2 pr-2" style={{ maxHeight: '300px' }}>
        <div className="flex flex-col gap-3">
          {expenses.map((expense) => {
            const Icon = getIcon(expense.icon);
            return (
              <div
                key={expense.id}
                className="flex items-center gap-3 min-w-0"
              >
                <div className="flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                  >
                    <Icon
                      width={20}
                      height={20}
                      strokeWidth={1.5}
                      style={{ color: '#E7E4E4' }}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-body font-medium text-wrap-safe break-words">
                  {expense.name}
                </div>
                <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">
                  $ {formatNumber(expense.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

