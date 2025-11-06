'use client';

import React from 'react';
import { Transaction } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { formatNumber } from '@/lib/utils';

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
}

export default function TransactionRow({ transaction, onClick, className = '' }: TransactionRowProps) {
  const Icon = getIcon(transaction.icon);
  const isUncategorized = transaction.category === null;

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
    >
      <div className="flex-shrink-0">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
        >
          <Icon 
            width={24} 
            height={24} 
            strokeWidth={1.5}
            style={{ color: '#E7E4E4' }}
          />
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="text-body font-medium text-wrap-safe">{transaction.name}</div>
        <div className="text-helper">{transaction.date}</div>
      </div>
      <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">
        ${formatNumber(transaction.amount)}
      </div>
    </div>
  );
}

