'use client';

import React from 'react';
import { Transaction } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import { formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { Wallet, ShoppingBag } from 'iconoir-react';

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
}

const MAX_NAME_LENGTH = 30;

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
}

export default function TransactionRow({ transaction, onClick, className = '' }: TransactionRowProps) {
  const { currency } = useCurrency();
  const Icon = getIcon(transaction.icon);
  const isUncategorized = transaction.category === null;
  const isExpense = transaction.amount < 0;
  const absoluteAmount = Math.abs(transaction.amount);
  const truncatedName = truncateName(transaction.name, MAX_NAME_LENGTH);

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      title={transaction.name.length > MAX_NAME_LENGTH ? transaction.name : undefined}
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
        <div className="flex items-center gap-2">
          <div className="text-body font-medium truncate">{truncatedName}</div>
          {isExpense ? (
            <ShoppingBag width={14} height={14} strokeWidth={1.5} style={{ color: '#D93F3F', flexShrink: 0 }} />
          ) : (
            <Wallet width={14} height={14} strokeWidth={1.5} style={{ color: '#74C648', flexShrink: 0 }} />
          )}
        </div>
        <div className="text-helper">{transaction.date}</div>
      </div>
      <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap">
        {currency.symbol}{formatNumber(absoluteAmount)}
      </div>
    </div>
  );
}

