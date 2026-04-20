'use client';

import Card from '@/components/ui/Card';
import DonutChart from '@/components/ui/DonutChart';
import { Investment } from '@/types/dashboard';
import { getAssetColor } from '@/lib/asset-utils';
import { BitcoinCircle, Cash, Neighbourhood, Reports } from 'iconoir-react';
import { useCurrency } from '@/hooks/useCurrency';

interface AssetAllocationCardProps {
    portfolio: Investment[];
}

const TYPE_COLORS: Record<string, string> = {
    crypto: getAssetColor('crypto'),
    stock: getAssetColor('stock'),
    property: getAssetColor('property'),
    custom: getAssetColor('custom'),
    other: getAssetColor('other'),
};

const TYPE_NAMES: Record<string, string> = {
    crypto: 'Crypto',
    stock: 'Stocks',
    property: 'Property',
    other: 'Others',
};

const TYPE_ICONS: Record<string, any> = {
    crypto: BitcoinCircle,
    stock: Cash,
    property: Neighbourhood,
    other: Reports,
};

export default function AssetAllocationCard({ portfolio }: AssetAllocationCardProps) {
    const { currency } = useCurrency(); // Get currency for amount formatting if needed, though we show % primarily

    if (!portfolio || portfolio.length === 0) return null;

    // 1. Group by type and sum value
    const totals: Record<string, number> = {};
    let grandTotal = 0;

    portfolio.forEach(item => {
        const type = item.assetType || 'other';
        const val = item.currentValue || 0;
        totals[type] = (totals[type] || 0) + val;
        grandTotal += val;
    });

    if (grandTotal === 0) return null;

    // 2. Format for DonutChart
    const data = Object.entries(totals)
        .map(([type, value]) => {
            const pct = (value / grandTotal) * 100;
            return {
                name: TYPE_NAMES[type] || type,
                value: Math.round(pct),
                displayPct: pct > 0 && pct < 0.1 ? '< 0.1' : pct < 1 && pct >= 0.1 ? '< 1' : Math.round(pct).toString(),
                color: TYPE_COLORS[type] || TYPE_COLORS.other,
                type: type, // Store type for icon lookup
                amount: value,
                raw: value
            };
        })
        .filter(item => item.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    return (
        <Card title="Allocation" className="h-full flex flex-col min-h-0 overflow-hidden">
            <div className="flex flex-col flex-1 min-h-0 h-full mt-2 gap-3">
                <div className="w-full h-[200px] 2xl:h-[280px] shrink-0 flex justify-center items-center">
                    <DonutChart data={data} />
                </div>

                <div className="shrink-0 max-h-[45%] space-y-3 w-full overflow-y-auto min-h-0 custom-scrollbar pr-2">
                    {data.map((item) => {
                        const Icon = TYPE_ICONS[item.type] || Reports;
                        return (
                            <div key={item.name} className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0" 
                                    style={{ backgroundColor: `${item.color}1a` }}
                                >
                                     <Icon width={20} height={20} strokeWidth={1.5} style={{ color: item.color }} />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="text-body font-medium text-primary truncate">{item.name}</div>
                                    <div className="text-helper text-secondary">{item.displayPct}%</div>
                                </div>

                                <div className="text-body font-semibold flex-shrink-0 tabular-nums text-primary">
                                     {currency.symbol}{Math.round(item.amount).toLocaleString()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}
