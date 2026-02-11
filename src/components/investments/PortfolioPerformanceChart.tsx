'use client';

import Card from '@/components/ui/Card';
import LineChart from '@/components/ui/LineChart';
import { useState } from 'react';

interface PortfolioPerformanceChartProps {
    data: Array<{ date: string; value: number }>;
    currencySymbol: string;
    onRangeChange: (range: string) => void;
    isLoading?: boolean;
}

const BENCHMARKS = [
    { label: 'S&P 500', value: 'SPY' },
    { label: 'BTC', value: 'BTC' },
];

export default function PortfolioPerformanceChart({ data, currencySymbol, onRangeChange, isLoading }: PortfolioPerformanceChartProps) {
    const [timeframe, setTimeframe] = useState('1M');

    const handleTimeframeChange = (tf: string) => {
        setTimeframe(tf);
        onRangeChange(tf);
    };

    return (
        <Card title="Performance" className="h-full flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-end gap-2 mb-4">
                <div className="flex bg-[#202020] rounded-lg p-1 border border-[#3a3a3a]">
                    {['1W', '1M', '3M', '1Y', 'All'].map((tf) => (
                        <button
                            key={tf}
                            onClick={() => handleTimeframeChange(tf)}
                            disabled={isLoading}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                                timeframe === tf
                                ? 'bg-[#AC66DA] text-white' 
                                : 'text-secondary hover:text-white'
                            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 w-full min-h-0 -ml-4 relative">
                {isLoading && (
                    <div className="absolute inset-0 z-10 bg-[#282828]/50 flex items-center justify-center backdrop-blur-sm">
                        <div className="w-6 h-6 border-2 border-[#AC66DA] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {data && data.length > 0 ? (
                    <LineChart 
                        data={data} 
                        currencySymbol={currencySymbol} 
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-helper">
                        No performance data available
                    </div>
                )}
            </div>
        </Card>
    );
}
