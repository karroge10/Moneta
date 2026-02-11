'use client';

import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { formatCompactNumber } from '@/lib/utils';

interface PortfolioTrendCardProps {
    balance: {
        amount: number;
        trend: number;
    };
    totalRealizedPnl?: number;
    totalUnrealizedPnl?: number;
    currency: {
        symbol: string;
    };
}

export default function PortfolioTrendCard({ balance, currency }: PortfolioTrendCardProps) {
    return (
        <Card title="Total Portfolio Value">
            <div className="flex flex-col flex-1 min-h-0">
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                    <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
                    <span className="text-card-value break-all min-w-0">{formatCompactNumber(balance.amount)}</span>
                </div>
                <TrendIndicator value={balance.trend} label="All Time Return" />
            </div>
        </Card>
    );
}
