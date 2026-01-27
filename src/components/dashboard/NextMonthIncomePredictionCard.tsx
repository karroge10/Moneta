'use client';

import Card from '@/components/ui/Card';
import { InfoCircle, NavArrowRight } from 'iconoir-react';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';

interface NextMonthIncomePredictionCardProps {
  amount: number;
}

export default function NextMonthIncomePredictionCard({ amount }: NextMonthIncomePredictionCardProps) {
  const { currency } = useCurrency();
  return (
    <Card title="Next Month Prediction">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap mb-4">
          <span className="text-card-currency flex-shrink-0">{currency.symbol}</span>
          <span className="text-card-value break-all min-w-0">{formatNumber(amount)}</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <InfoCircle width={16} height={16} strokeWidth={1.5} style={{ color: '#AC66DA' }} />
          <span className="text-helper" style={{ color: '#AC66DA' }}>
            Based on current income patterns
          </span>
        </div>
        <Link href="/help" className="text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors flex-wrap">
          <span className="text-wrap-safe break-words" style={{ color: '#AC66DA' }}>
            Learn how we do predictions
          </span>
          <NavArrowRight width={14} height={14} className="stroke-current transition-colors flex-shrink-0" style={{ color: '#AC66DA' }} />
        </Link>
      </div>
    </Card>
  );
}


