'use client';

import Card from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';

interface TotalInvestedCardProps {
    totalCost: number;
    currency: {
        symbol: string;
    };
}

export default function TotalInvestedCard({ totalCost, currency }: TotalInvestedCardProps) {
    return (
        <Card title="Total Invested">
            <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                    <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
                    <span className="text-card-value break-all min-w-0">
                        {formatNumber(totalCost)}
                    </span>
                </div>
            </div>
        </Card>
    );
}
