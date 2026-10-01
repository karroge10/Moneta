'use client';

import { useState, type FormEvent } from 'react';
import { Trash } from 'iconoir-react';
import { Goal } from '@/types/dashboard';
import { useCurrency } from '@/hooks/useCurrency';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Field, { inputClass } from '@/components/ui/Field';
import { cx } from '@/components/ui/cx';
import DateField from '@/components/investments/DateField';
import CurrencySelector from '@/components/transactions/import/CurrencySelector';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import type { CurrencyOption } from '@/lib/currency-country-map';

interface GoalFormProps {
  goal: Goal;
  mode: 'add' | 'edit';
  currencyOptions: CurrencyOption[];
  onSave: (goal: Goal) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSaving?: boolean;
}

type GoalErrors = Partial<Record<'name' | 'targetDate' | 'targetAmount' | 'currentAmount', string>>;

/** Name, target date, currency and amounts for a goal, validated inline on submit. */
export default function GoalForm({ goal, mode, currencyOptions, onSave, onCancel, onDelete, isSaving = false }: GoalFormProps) {
  const { currency: userCurrency } = useCurrency();
  const [name, setName] = useState(goal.name);
  const [targetDate, setTargetDate] = useState(goal.targetDate);
  const [currencyId, setCurrencyId] = useState<number | null>(goal.currencyId ?? null);
  const [targetAmountInput, setTargetAmountInput] = useState(goal.targetAmount.toString());
  const [currentAmountInput, setCurrentAmountInput] = useState(goal.currentAmount.toString());
  const [errors, setErrors] = useState<GoalErrors>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const displayCurrency = currencyId != null ? (currencyOptions.find((c) => c.id === currencyId) ?? userCurrency) : userCurrency;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const targetAmount = parseDecimal(targetAmountInput);
    const currentAmount = parseDecimal(currentAmountInput);
    const nextErrors = validate(name, targetDate, targetAmount, currentAmount);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      ...goal,
      name,
      targetDate,
      targetAmount,
      currentAmount,
      currencyId: currencyId ?? undefined,
    });
  };

  const handleDeleteConfirm = () => {
    onDelete?.();
    setShowDeleteConfirm(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Field label="Goal Name" error={errors.name}>
        {(controlProps) => (
          <input
            {...controlProps}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSaving}
            className={inputClass}
            placeholder="Enter goal name"
            required
          />
        )}
      </Field>

      <div>
        <DateField
          label="Target Date"
          value={targetDate}
          onChange={(value) => setTargetDate(formatDateForDisplay(value))}
          disabled={isSaving}
        />
        {errors.targetDate && <p className="mt-1.5 text-caption text-negative-fg">{errors.targetDate}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-ui font-medium text-secondary">Currency</span>
        <CurrencySelector options={currencyOptions} selectedCurrencyId={currencyId} onSelect={setCurrencyId} disabled={isSaving} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AmountField
          label="Target Amount"
          symbol={displayCurrency.symbol}
          value={targetAmountInput}
          onChange={setTargetAmountInput}
          error={errors.targetAmount}
          disabled={isSaving}
        />
        <AmountField
          label="Current Amount"
          symbol={displayCurrency.symbol}
          value={currentAmountInput}
          onChange={setCurrentAmountInput}
          error={errors.currentAmount}
          disabled={isSaving}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        {mode === 'edit' && onDelete && (
          <Button
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isSaving}
            icon={<Trash width={16} height={16} strokeWidth={1.5} aria-hidden="true" />}
            className="sm:mr-auto"
          >
            Delete
          </Button>
        )}
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving}>
          {mode === 'add' ? 'Add Goal' : 'Save Changes'}
        </Button>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Goal"
        message={
          <>
            Are you sure you want to delete your goal <span className="font-bold text-fg">{name || 'this goal'}</span>?
            <br />
            <br />
            This will permanently remove the goal and all tracked progress. This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isSaving}
        variant="danger"
      />
    </form>
  );
}

interface AmountFieldProps {
  label: string;
  symbol: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
}

function AmountField({ label, symbol, value, onChange, error, disabled }: AmountFieldProps) {
  return (
    <Field label={label} error={error}>
      {(controlProps) => (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui font-semibold text-fg">{symbol}</span>
          <input
            {...controlProps}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(event) => onChange(sanitizeDecimal(event.target.value))}
            disabled={disabled}
            className={cx(inputClass, 'pl-8 tabular-nums')}
            placeholder="0.00"
            required
          />
        </div>
      )}
    </Field>
  );
}

function validate(name: string, targetDate: string, targetAmount: number, currentAmount: number): GoalErrors {
  const errors: GoalErrors = {};
  if (!name.trim()) errors.name = 'Please enter a goal name';
  if (!targetDate) errors.targetDate = 'Please select a target date';
  if (Number.isNaN(targetAmount) || targetAmount <= 0) errors.targetAmount = 'Target amount must be greater than 0';
  if (Number.isNaN(currentAmount) || currentAmount < 0) errors.currentAmount = 'Current amount cannot be negative';
  return errors;
}

function sanitizeDecimal(value: string): string {
  return value.replace(/[^0-9.,]/g, '');
}

function parseDecimal(value: string): number {
  const normalized = value.replace(/,/g, '.');
  return parseFloat(normalized);
}
