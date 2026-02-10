'use client';

import Card from '@/components/ui/Card';
import DonutChart from '@/components/ui/DonutChart';
import { Investment } from '@/types/dashboard';
import { getAssetColor } from '@/lib/asset-utils';

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

export default function AssetAllocationCard({ portfolio }: AssetAllocationCardProps) {
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
        .map(([type, value]) => ({
            name: TYPE_NAMES[type] || type,
            value: Math.round((value / grandTotal) * 100),
            color: TYPE_COLORS[type] || TYPE_COLORS.other,
            raw: value
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value);

    return (
        <Card title="Portfolio Allocation">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 h-full">
                {/* Chart Section */}
                <div className="w-40 h-40 flex-shrink-0">
                    <DonutChart data={data} />
                </div>

                {/* Legend Section */}
                <div className="flex-1 space-y-3 w-full">
                    {data.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-sm font-medium text-secondary">{item.name}</span>
                            </div>
                            <span className="text-sm font-bold">{item.value}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}
