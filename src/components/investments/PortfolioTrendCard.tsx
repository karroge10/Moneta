'use client';

import Card from '@/components/ui/Card';
import TrendIndicator from '@/components/ui/TrendIndicator';
import { formatSmartNumber } from '@/lib/utils';

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
            <div className="flex flex-col h-full justify-between min-h-[120px]">
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl text-secondary font-medium">{currency.symbol}</span>
                    <span className="text-4xl font-bold tracking-tight text-[#E7E4E4]">
                        {balance.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
                
                <div className="mt-auto">
                    <TrendIndicator value={balance.trend} label="All Time Return" />
                </div>
            </div>
        </Card>
    );
}
