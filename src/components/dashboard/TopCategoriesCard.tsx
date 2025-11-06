import Card from '@/components/ui/Card';
import DonutChart from '@/components/ui/DonutChart';
import { ExpenseCategory } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { formatNumber } from '@/lib/utils';

interface TopCategoriesCardProps {
  categories: ExpenseCategory[];
}

export default function TopCategoriesCard({ categories }: TopCategoriesCardProps) {
  if (categories.length === 0) {
    return (
      <Card title="Top Categories">
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add transactions to see your spending</div>
          <div className="text-helper text-center">Your top expense categories will appear here</div>
        </div>
      </Card>
    );
  }

  const chartData = categories.map(cat => ({
    name: cat.name,
    value: cat.percentage,
    color: cat.color,
  }));

  return (
    <Card title="Top Categories">
      <div className="mt-2 flex flex-col flex-1">
        <div className="w-full h-[200px] 2xl:h-[280px]">
          <DonutChart data={chartData} />
        </div>
        <div className="space-y-3 mt-4 flex-1">
          {categories.map((category) => {
            const Icon = getIcon(category.icon);
            return (
              <div key={category.id} className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                  >
                    <Icon width={24} height={24} strokeWidth={1.5} style={{ color: '#E7E4E4' }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden text-body font-medium text-wrap-safe break-words">{category.name}</div>
                <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">
                  ${formatNumber(category.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

