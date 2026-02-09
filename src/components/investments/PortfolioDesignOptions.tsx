'use client';

import { Investment } from '@/types/dashboard';
import { useState } from 'react';
import AssetLogo from './AssetLogo';
import { NavArrowLeft, NavArrowRight, StatUp, StatDown } from 'iconoir-react';

interface PortfolioDesignProps {
    portfolio: Investment[];
    currency: { symbol: string };
    onAssetClick: (investment: Investment) => void;
}

// ============================================
// OPTION 1: COMPACT LIST WITH MINI CHARTS
// ============================================
export function CompactListDesign({ portfolio, currency, onAssetClick }: PortfolioDesignProps) {
    return (
        <div className="max-h-[400px] overflow-y-auto pr-2 -mr-2">
            <div className="space-y-2">
                {portfolio.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => onAssetClick(item)}
                        className="flex items-center gap-3 p-3 bg-[#202020] rounded-xl border border-[#3a3a3a] cursor-pointer hover:border-[#AC66DA] transition-colors group"
                    >
                        {/* Icon + Name */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-[#282828] flex items-center justify-center border border-[#3a3a3a] flex-shrink-0">
                                <AssetLogo src={item.icon} size={22} className="text-[#AC66DA]" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-sm truncate group-hover:text-[#AC66DA] transition-colors">{item.name}</div>
                                <div className="text-xs text-helper uppercase tracking-wider">{item.ticker}</div>
                            </div>
                        </div>

                        {/* Mini Trend Indicator */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {(item.changePercent || 0) >= 0 ? (
                                <StatUp width={16} height={16} className="text-[#74C648]" strokeWidth={2.5} />
                            ) : (
                                <StatDown width={16} height={16} className="text-[#D93F3F]" strokeWidth={2.5} />
                            )}
                        </div>

                        {/* Value + Change */}
                        <div className="text-right flex-shrink-0">
                            <div className="font-bold text-sm">{currency.symbol}{item.currentValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            <div className={`text-xs font-bold ${(item.changePercent || 0) >= 0 ? 'text-[#74C648]' : 'text-[#D93F3F]'}`}>
                                {(item.changePercent || 0) >= 0 ? '+' : ''}{(item.changePercent || 0).toFixed(2)}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// OPTION 2: CAROUSEL/SLIDER CARDS
// ============================================
export function CarouselDesign({ portfolio, currency, onAssetClick }: PortfolioDesignProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const itemsPerPage = 3;
    const totalPages = Math.ceil(portfolio.length / itemsPerPage);

    const nextPage = () => {
        setCurrentIndex((prev) => (prev + 1) % totalPages);
    };

    const prevPage = () => {
        setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
    };

    const visibleItems = portfolio.slice(
        currentIndex * itemsPerPage,
        (currentIndex + 1) * itemsPerPage
    );

    return (
        <div className="relative">
            {/* Carousel Container */}
            <div className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 min-h-[200px]">
                    {visibleItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onAssetClick(item)}
                            className="p-5 bg-[#202020] rounded-3xl border-2 border-[#3a3a3a] cursor-pointer hover:border-[#AC66DA] transition-colors"
                        >
                            {/* Header with Icon */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#AC66DA]/20 to-[#282828] flex items-center justify-center border-2 border-[#AC66DA]/30">
                                    <AssetLogo src={item.icon} size={28} className="text-[#AC66DA]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-base truncate">{item.name}</div>
                                    <div className="text-xs text-helper uppercase tracking-widest">{item.ticker}</div>
                                </div>
                            </div>

                            {/* Value Display */}
                            <div className="mb-3">
                                <div className="text-xs text-helper mb-1">Current Value</div>
                                <div className="text-2xl font-bold">{currency.symbol}{item.currentValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </div>

                            {/* Performance Badge */}
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${(item.changePercent || 0) >= 0 ? 'bg-[#74C648]/10 border border-[#74C648]/30' : 'bg-[#D93F3F]/10 border border-[#D93F3F]/30'}`}>
                                {(item.changePercent || 0) >= 0 ? (
                                    <StatUp width={14} height={14} className="text-[#74C648]" strokeWidth={2.5} />
                                ) : (
                                    <StatDown width={14} height={14} className="text-[#D93F3F]" strokeWidth={2.5} />
                                )}
                                <span className={`text-sm font-bold ${(item.changePercent || 0) >= 0 ? 'text-[#74C648]' : 'text-[#D93F3F]'}`}>
                                    {(item.changePercent || 0) >= 0 ? '+' : ''}{(item.changePercent || 0).toFixed(2)}%
                                </span>
                                <span className={`text-xs ${(item.changePercent || 0) >= 0 ? 'text-[#74C648]/70' : 'text-[#D93F3F]/70'}`}>
                                    ({(item.gainLoss || 0) >= 0 ? '+' : ''}{currency.symbol}{Math.abs(item.gainLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Navigation Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                        onClick={prevPage}
                        className="w-8 h-8 rounded-full bg-[#282828] border border-[#3a3a3a] flex items-center justify-center hover:border-[#AC66DA] transition-colors"
                        aria-label="Previous"
                    >
                        <NavArrowLeft width={16} height={16} strokeWidth={2.5} />
                    </button>

                    {/* Dots Indicator */}
                    <div className="flex gap-2">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-[#AC66DA] w-6' : 'bg-[#3a3a3a]'}`}
                                aria-label={`Go to page ${idx + 1}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={nextPage}
                        className="w-8 h-8 rounded-full bg-[#282828] border border-[#3a3a3a] flex items-center justify-center hover:border-[#AC66DA] transition-colors"
                        aria-label="Next"
                    >
                        <NavArrowRight width={16} height={16} strokeWidth={2.5} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ============================================
// OPTION 3: TABLE VIEW WITH SORTABLE COLUMNS
// ============================================
type SortField = 'name' | 'type' | 'value' | 'change';
type SortDirection = 'asc' | 'desc';

export function TableDesign({ portfolio, currency, onAssetClick }: PortfolioDesignProps) {
    const [sortField, setSortField] = useState<SortField>('value');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const sortedPortfolio = [...portfolio].sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'type':
                comparison = a.type.localeCompare(b.type);
                break;
            case 'value':
                comparison = (a.currentValue || 0) - (b.currentValue || 0);
                break;
            case 'change':
                comparison = (a.changePercent || 0) - (b.changePercent || 0);
                break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? (
            <StatUp width={14} height={14} strokeWidth={2.5} className="inline ml-1" />
        ) : (
            <StatDown width={14} height={14} strokeWidth={2.5} className="inline ml-1" />
        );
    };

    return (
        <div className="rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: '#202020' }}>
            <div className="max-h-[400px] overflow-y-auto">
                <table className="min-w-full">
                    <thead className="sticky top-0 bg-[#202020] z-10 border-b border-[#3a3a3a]">
                        <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                            <th
                                className="px-5 py-3 align-top cursor-pointer hover:text-[#E7E4E4] transition-colors"
                                onClick={() => handleSort('name')}
                            >
                                Asset <SortIcon field="name" />
                            </th>
                            <th
                                className="px-5 py-3 align-top cursor-pointer hover:text-[#E7E4E4] transition-colors"
                                onClick={() => handleSort('type')}
                            >
                                Type <SortIcon field="type" />
                            </th>
                            <th
                                className="px-5 py-3 align-top cursor-pointer hover:text-[#E7E4E4] transition-colors text-right"
                                onClick={() => handleSort('value')}
                            >
                                Value <SortIcon field="value" />
                            </th>
                            <th
                                className="px-5 py-3 align-top cursor-pointer hover:text-[#E7E4E4] transition-colors text-right"
                                onClick={() => handleSort('change')}
                            >
                                Change <SortIcon field="change" />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPortfolio.map((item) => (
                            <tr
                                key={item.id}
                                className="border-t border-[#2A2A2A] cursor-pointer hover:bg-[#282828] transition-colors group"
                                onClick={() => onAssetClick(item)}
                            >
                                <td className="px-5 py-4 align-top">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-[#282828] flex items-center justify-center border border-[#3a3a3a] flex-shrink-0">
                                            <AssetLogo src={item.icon} size={20} className="text-[#AC66DA]" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm truncate group-hover:text-[#AC66DA] transition-colors">{item.name}</div>
                                            <div className="text-xs text-helper uppercase tracking-wider">{item.ticker}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4 align-top">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#282828] border border-[#3a3a3a] text-xs font-medium">
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-5 py-4 align-top text-right">
                                    <div className="font-bold text-sm">{currency.symbol}{item.currentValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </td>
                                <td className="px-5 py-4 align-top text-right">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${(item.changePercent || 0) >= 0 ? 'bg-[#74C648]/10 border border-[#74C648]/30' : 'bg-[#D93F3F]/10 border border-[#D93F3F]/30'}`}>
                                        {(item.changePercent || 0) >= 0 ? (
                                            <StatUp width={12} height={12} className="text-[#74C648]" strokeWidth={2.5} />
                                        ) : (
                                            <StatDown width={12} height={12} className="text-[#D93F3F]" strokeWidth={2.5} />
                                        )}
                                        <span className={`text-xs font-bold ${(item.changePercent || 0) >= 0 ? 'text-[#74C648]' : 'text-[#D93F3F]'}`}>
                                            {(item.changePercent || 0) >= 0 ? '+' : ''}{(item.changePercent || 0).toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className={`text-xs mt-1 ${(item.changePercent || 0) >= 0 ? 'text-[#74C648]/70' : 'text-[#D93F3F]/70'}`}>
                                        {(item.gainLoss || 0) >= 0 ? '+' : ''}{currency.symbol}{Math.abs(item.gainLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
