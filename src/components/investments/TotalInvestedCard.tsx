'use client';

import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { formatCompactNumber } from '@/lib/utils';

interface TotalInvestedCardProps {
    totalCost: number;
    trend?: number;
    comparisonLabel?: string;
    currency: {
        symbol: string;
    };
}

export default function TotalInvestedCard({ totalCost, trend, comparisonLabel, currency }: TotalInvestedCardProps) {
    return (
        <Card title="Total Invested">
            <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                    <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
                    <span className="text-card-value break-all min-w-0">
                        {formatCompactNumber(totalCost)}
                    </span>
                </div>
                {trend !== undefined && comparisonLabel && comparisonLabel.trim() !== '' && (
                    <TrendIndicator value={trend} label={comparisonLabel} />
                )}
            </div>
        </Card>
    );
}
