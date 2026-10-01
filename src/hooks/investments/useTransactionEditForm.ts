'use client';

import { useState } from 'react';
import { formatDateToInput } from '@/lib/dateFormatting';
import type { Investment } from '@/types/dashboard';
import type { InvestmentTransactionEditState } from '@/types/investments';

/** Holdings below this after the edit count as negative (float noise tolerance). */
const NEGATIVE_EPSILON = -0.00000001;

/**
 * Edit state for one investment transaction. Mount it per transaction (key by id) so the initial
 * values come from the transaction without a syncing effect.
 */
export function useTransactionEditForm(
  transaction: InvestmentTransactionEditState,
  portfolio: Investment[],
  fallbackCurrencyId: number,
) {
  const [investmentType, setInvestmentType] = useState(transaction.investmentType);
  const [quantityInput, setQuantityInput] = useState(transaction.quantity.toString());
  const [priceInput, setPriceInput] = useState(transaction.pricePerUnit.toString());
  const [dateInput, setDateInput] = useState(() => formatDateToInput(transaction.date) || '');
  const [currencyId, setCurrencyId] = useState<number | null>(
    transaction.currencyId || transaction.currency?.id || fallbackCurrencyId,
  );

  const quantity = parseDecimal(quantityInput);
  const pricePerUnit = parseDecimal(priceInput);
  const total = quantity * pricePerUnit;
  const currentHolding = findHoldingQuantity(portfolio, transaction);
  const predictedHolding = predictHolding(currentHolding, transaction, investmentType, quantity);
  const goesNegative = predictedHolding < NEGATIVE_EPSILON;
  const canSubmit = Boolean(quantityInput) && Boolean(priceInput) && !goesNegative;

  const toSavePayload = (): InvestmentTransactionEditState => {
    const label = transaction.assetTicker || transaction.assetName || 'Asset';
    return {
      ...transaction,
      investmentType,
      name: `${investmentType === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${label}`,
      amount: investmentType === 'buy' ? -total : total,
      date: dateInput,
      quantity,
      pricePerUnit,
      currencyId: currencyId || undefined,
    };
  };

  return {
    investmentType,
    setInvestmentType,
    quantityInput,
    setQuantityInput: (value: string) => setQuantityInput(sanitizeDecimal(value)),
    priceInput,
    setPriceInput: (value: string) => setPriceInput(sanitizeDecimal(value)),
    dateInput,
    setDateInput,
    currencyId,
    setCurrencyId,
    total,
    currentHolding,
    predictedHolding,
    goesNegative,
    canSubmit,
    toSavePayload,
  };
}

function sanitizeDecimal(value: string): string {
  return value.replace(/[^0-9.,]/g, '');
}

/** Accepts both "1.5" and "1,5". */
function parseDecimal(value: string): number {
  const normalized = value.replace(/,/g, '.');
  return parseFloat(normalized) || 0;
}

function findHoldingQuantity(portfolio: Investment[], transaction: InvestmentTransactionEditState): number {
  const name = (transaction.assetName || '').toLowerCase();
  const holding = portfolio.find(
    (asset) => (transaction.assetTicker && asset.ticker === transaction.assetTicker) || asset.name.toLowerCase() === name,
  );
  return holding?.quantity || 0;
}

/** Holding after replacing the original transaction with the edited one. */
function predictHolding(
  current: number,
  original: InvestmentTransactionEditState,
  newType: 'buy' | 'sell',
  newQuantity: number,
): number {
  const withoutOriginal = original.investmentType === 'buy' ? current - original.quantity : current + original.quantity;
  return newType === 'buy' ? withoutOriginal + newQuantity : withoutOriginal - newQuantity;
}
