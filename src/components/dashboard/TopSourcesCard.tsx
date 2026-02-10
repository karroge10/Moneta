'use client';

import Card from '@/components/ui/Card';
import DonutChart from '@/components/ui/DonutChart';
import { IncomeSource } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

interface TopSourcesCardProps {
  sources: IncomeSource[];
}

export default function TopSourcesCard({ sources }: TopSourcesCardProps) {
  const { currency } = useCurrency();
  if (sources.length === 0) {
    return (
      <Card title="Top Sources">
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">Add income to see your sources</div>
          <div className="text-helper text-center">Your top income sources will appear here</div>
        </div>
      </Card>
    );
  }

  const chartData = sources.map(src => ({
    name: src.name,
    value: src.percentage,
    color: src.color,
  }));

  return (
    <Card title="Top Sources">
      <div className="mt-2 flex flex-col flex-1">
        <div className="w-full h-[200px] 2xl:h-[280px]">
          <DonutChart data={chartData} />
        </div>
        <div className="space-y-3 mt-4 flex-1">
          {sources.map((source) => {
            const Icon = getIcon(source.icon);
            return (
              <div key={source.id} className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">
                  <div
                    className="w-12 h-12 icon-circle"
                    style={{ backgroundColor: `${source.color}1a` }}
                  >
                    <Icon width={24} height={24} strokeWidth={1.5} style={{ color: source.color }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden text-body font-medium text-wrap-safe break-words">{source.name}</div>
                <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">
                  {currency.symbol}{formatNumber(source.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

