'use client';

import { useState, type FormEvent } from 'react';
import type { Category, RecurringFrequencyUnit, Transaction } from '@/types/dashboard';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDateForDisplay, formatDateToInput } from '@/lib/dateFormatting';

export type TransactionType = 'expense' | 'income';

export interface CurrencyOptionLite {
  id: number;
  name: string;
  symbol: string;
  alias: string;
}

interface UseTransactionFormOptions {
  transaction: Transaction;
  mode: 'add' | 'edit';
  categories: Category[];
  currencyOptions: CurrencyOptionLite[];
  onSave: (transaction: Transaction) => void;
}

/**
 * State and derived values for the add/edit transaction form. The form is keyed by transaction id
 * by its parent, so initial values are read once from `transaction`.
 */
export function useTransactionForm({ transaction, mode, categories, currencyOptions, onSave }: UseTransactionFormOptions) {
  const { currency, loading: currencyLoading } = useCurrency();
  const initialDate = formatDateToInput(transaction.date);

  const [name, setName] = useState(initialName(transaction));
  const [categoryName, setCategoryName] = useState<string | null>(transaction.category);
  const [date, setDate] = useState(initialDate);
  const [chosenCurrencyId, setChosenCurrencyId] = useState<number | undefined>(transaction.currencyId);
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>(transaction.amount > 0 ? 'income' : 'expense');
  const [amountInput, setAmountInputState] = useState(initialAmountInput(transaction));
  const [recurringEnabled, setRecurringEnabled] = useState(transaction.recurring?.isRecurring ?? false);
  const [recurringUnit, setRecurringUnit] = useState<RecurringFrequencyUnit>(transaction.recurring?.frequencyUnit ?? 'month');
  const [recurringInterval, setRecurringInterval] = useState(transaction.recurring?.frequencyInterval ?? 1);
  const [recurringStartDate, setRecurringStartDate] = useState(transaction.recurring?.startDate ?? initialDate);
  const [recurringEndDate, setRecurringEndDate] = useState(transaction.recurring?.endDate ?? '');

  const typeCategories = categories.filter((category) => !category.type || category.type === transactionType);
  const selectedCategory = categoryName ? (typeCategories.find((c) => c.name === categoryName) ?? null) : null;
  const userCurrencyAvailable = currencyOptions.some((option) => option.id === currency.id);
  const defaultCurrencyId =
    mode === 'add' && !transaction.currencyId && !currencyLoading && currency.id && userCurrencyAvailable
      ? currency.id
      : undefined;
  const currencyId = currencyTouched ? chosenCurrencyId : (chosenCurrencyId ?? defaultCurrencyId);
  const selectedCurrency = currencyOptions.find((option) => option.id === currencyId) ?? currency;
  const amount = parseAmount(amountInput);
  const isExistingRecurring = transaction.recurringId !== undefined;

  const setAmountInput = (raw: string) => {
    const sanitized = raw.replace(/[^0-9.,]/g, '');
    setAmountInputState(sanitized);
  };

  const selectCategory = (categoryId: string | null) => {
    const category = categoryId ? typeCategories.find((item) => item.id === categoryId) : undefined;
    setCategoryName(category?.name ?? null);
  };

  const selectCurrency = (id: number | null) => {
    setChosenCurrencyId(id ?? undefined);
    setCurrencyTouched(true);
  };

  const toggleRecurring = () => {
    if (isExistingRecurring) return;
    setRecurringEnabled((enabled) => !enabled);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const startDate = mode === 'add' ? date : recurringStartDate || date;
    const recurring = recurringEnabled
      ? {
          isRecurring: true,
          frequencyUnit: recurringUnit,
          frequencyInterval: Math.max(1, recurringInterval || 1),
          startDate,
          endDate: recurringEndDate || null,
          type: transactionType,
          isActive: isExistingRecurring ? (transaction.recurring?.isActive ?? true) : undefined,
        }
      : undefined;
    const category = selectedCategory?.name ?? null;

    onSave({
      ...transaction,
      name,
      date: date ? formatDateForDisplay(date) : transaction.date,
      category,
      icon: selectedCategory?.icon ?? 'HelpCircle',
      amount: transactionType === 'expense' ? -amount : amount,
      currencyId,
      recurring,
    });
  };

  return {
    mode,
    transaction,
    name,
    setName,
    typeCategories,
    selectedCategory,
    selectCategory,
    date,
    setDate,
    currencyId,
    selectedCurrency,
    selectCurrency,
    userCurrency: currency,
    transactionType,
    setTransactionType,
    amountInput,
    setAmountInput,
    recurringEnabled,
    toggleRecurring,
    isExistingRecurring,
    recurringUnit,
    setRecurringUnit,
    recurringInterval,
    setRecurringInterval,
    recurringStartDate,
    setRecurringStartDate,
    recurringEndDate,
    setRecurringEndDate,
    handleSubmit,
  };
}

export type TransactionFormState = ReturnType<typeof useTransactionForm>;

/** Prefer the original bank description so edits start from what was imported. */
function initialName(transaction: Transaction): string {
  return transaction.originalDescription || transaction.fullName || transaction.name;
}

function initialAmountInput(transaction: Transaction): string {
  const value = transaction.originalAmount ?? transaction.amount;
  return value ? Math.abs(value).toString() : '';
}

function parseAmount(input: string): number {
  const normalized = input.replace(/,/g, '.');
  const value = Number.parseFloat(normalized);
  return Number.isNaN(value) ? 0 : value;
}
