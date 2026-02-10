/* eslint-disable react-hooks/static-components */
'use client';

import React, { useMemo } from 'react';
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
  const Icon = useMemo(() => getIcon(transaction.icon), [transaction.icon]);
  const isExpense = transaction.amount < 0;
  const originalAmount = transaction.originalAmount ?? transaction.amount;
  const absoluteOriginalAmount = Math.abs(originalAmount);
  const convertedAbsoluteAmount = Math.abs(transaction.amount);
  const displaySymbol = transaction.originalCurrencySymbol ?? currency.symbol;
  const shouldShowConvertedHelper =
    !!transaction.originalCurrencySymbol &&
    (transaction.originalCurrencySymbol !== currency.symbol ||
      convertedAbsoluteAmount !== absoluteOriginalAmount);
  const truncatedName = truncateName(transaction.name, MAX_NAME_LENGTH);

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      title={transaction.name.length > MAX_NAME_LENGTH ? transaction.name : undefined}
    >
      <div className="flex-shrink-0">
        <div
          className="w-12 h-12 icon-circle"
          style={{ backgroundColor: `${transaction.color || '#AC66DA'}1a` }}
        >
          <Icon 
            width={24} 
            height={24} 
            strokeWidth={1.5}
            style={{ color: transaction.color || '#AC66DA' }}
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
      <div className="flex flex-col items-end flex-shrink-0 text-right">
        <div className="text-body font-semibold whitespace-nowrap">
          {displaySymbol}{formatNumber(absoluteOriginalAmount)}
        </div>
        {shouldShowConvertedHelper && (
          <div className="text-helper text-xs whitespace-nowrap">
            ≈ {currency.symbol}{formatNumber(convertedAbsoluteAmount)}
          </div>
        )}
      </div>
    </div>
  );
}

