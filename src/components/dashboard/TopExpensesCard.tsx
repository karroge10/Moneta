'use client';

import Card from '@/components/ui/Card';
import DonutChart from '@/components/ui/DonutChart';
import { ExpenseCategory } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface TopExpensesCardProps {
  expenses: ExpenseCategory[];
  horizontal?: boolean;
}

export default function TopExpensesCard({ expenses, horizontal = false }: TopExpensesCardProps) {
  const { currency } = useCurrency();
  if (expenses.length === 0) {
    return (
      <Card title="Top Expenses">
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add transactions to see your spending</div>
          <div className="text-helper text-center">Your top expense categories will appear here</div>
        </div>
      </Card>
    );
  }

  const chartData = expenses.map(exp => ({
    name: exp.name,
    value: exp.percentage,
    color: exp.color,
  }));

  // Horizontal layout: graph on left, categories on right
  if (horizontal) {
    return (
      <Card title="Top Expenses">
        <div className="mt-2 flex flex-col flex-1">
          <div className="flex gap-6 items-start min-h-0">
            {/* Graph on left */}
            <div className="flex-shrink-0 w-[200px] h-[200px] 2xl:w-[250px] 2xl:h-[250px]">
              <DonutChart data={chartData} />
            </div>
            {/* Categories on right */}
            <div className="flex-1 space-y-3 min-w-0">
              {expenses.map((expense, index) => {
                const Icon = getIcon(expense.icon);
                return (
                  <div key={expense.id} className="flex items-center gap-3 min-w-0">
                    {/* Colored indicator matching donut chart */}
                    <div className="flex-shrink-0 w-3 h-3 rounded-full" style={{ backgroundColor: expense.color }} />
                    <div className="flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                      >
                        <Icon width={20} height={20} strokeWidth={1.5} style={{ color: '#E7E4E4' }} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="text-body font-medium text-wrap-safe break-words">{expense.name}</div>
                      <div className="text-helper text-xs mt-0.5">{expense.percentage}%</div>
                    </div>
                    <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">
                      {currency.symbol}{formatNumber(expense.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Vertical layout: graph on top, categories below
  return (
    <Card title="Top Expenses">
      <div className="mt-2 flex flex-col flex-1">
        <div className="w-full h-[200px] 2xl:h-[280px]">
          <DonutChart data={chartData} />
        </div>
        <div className="space-y-3 mt-4 flex-1">
          {expenses.map((expense, index) => {
            const Icon = getIcon(expense.icon);
            return (
              <div key={expense.id} className="flex items-center gap-3 min-w-0">
                {/* Colored indicator matching donut chart */}
                <div className="flex-shrink-0 w-3 h-3 rounded-full" style={{ backgroundColor: expense.color }} />
                <div className="flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                  >
                    <Icon width={20} height={20} strokeWidth={1.5} style={{ color: '#E7E4E4' }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-body font-medium text-wrap-safe break-words">{expense.name}</div>
                  <div className="text-helper text-xs mt-0.5">{expense.percentage}%</div>
                </div>
                <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">
                  {currency.symbol}{formatNumber(expense.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}


