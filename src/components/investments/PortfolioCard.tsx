'use client';

import {
    BitcoinCircle,
    Cash,
    Neighbourhood,
    Reports,
    NavArrowRight,
    EditPencil
} from 'iconoir-react';
import { Investment } from '@/types/dashboard';
import { useCurrency } from '@/hooks/useCurrency';

interface PortfolioCardProps {
    data: Investment;
    onClick: () => void;
    onEdit: () => void;
}

export default function PortfolioCard({ data, onClick, onEdit }: PortfolioCardProps) {
    const { currency } = useCurrency();
    const currencySymbol = currency.symbol;

    // Icon mapping
    const IconComponent = (() => {
        switch (data.assetType) {
            case 'crypto': return BitcoinCircle;
            case 'stock': return Cash;
            case 'property': return Neighbourhood;
            default: return Reports;
        }
    })();

    // Or use string icon if flexible
    const Icon = IconComponent;

    const isPositive = data.changePercent >= 0;

    return (
        <div
            className="bg-[#282828] border border-[#3a3a3a] rounded-3xl p-6 relative group hover:border-[#AC66DA] transition-all cursor-pointer"
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#202020] flex items-center justify-center border border-[#3a3a3a] text-[#AC66DA]">
                        <Icon width={24} height={24} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-primary">{data.name}</h3>
                        <div className="flex items-center gap-2">
                            {data.ticker && (
                                <span className="text-xs font-bold text-[#AC66DA] tracking-wider bg-[#AC66DA]/10 px-2 py-0.5 rounded uppercase">
                                    {data.ticker}
                                </span>
                            )}
                            <span className="text-xs text-helper">
                                {data.quantity?.toLocaleString()} units
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="p-2 rounded-xl hover:bg-[#3a3a3a] text-helper hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                >
                    <EditPencil width={20} height={20} />
                </button>
            </div>

            <div className="space-y-1">
                <p className="text-helper text-xs uppercase tracking-wider">Current Value</p>
                <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-white">
                        {currencySymbol}{data.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>

                    <div className={`flex items-center gap-1.5 text-sm font-bold ${isPositive ? 'text-[#74C648]' : 'text-[#D93F3F]'}`}>
                        <span>{isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            {/* Optional: Add sparkline or mini chart if data.priceHistory exists in future */}
        </div>
    );
}
