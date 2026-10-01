'use client';

import { Language, ShoppingBag, Wallet } from 'iconoir-react';
import type { RecurringFrequencyUnit } from '@/types/dashboard';
import Field, { inputClass } from '@/components/ui/Field';
import { cx } from '@/components/ui/cx';
import CurrencySelector from '@/components/transactions/import/CurrencySelector';
import CategoryIcon from '@/components/transactions/shared/CategoryIcon';
import FormSelect, { DateFieldButton, type FormSelectOption } from '@/components/transactions/form/FormSelect';
import type { CurrencyOptionLite, TransactionFormState, TransactionType } from '@/hooks/transactions/useTransactionForm';
import { formatMoney } from '@/lib/format';

interface TransactionFormProps {
  /** Form id so footer buttons outside the <form> can submit it. */
  id: string;
  form: TransactionFormState;
  currencyOptions: CurrencyOptionLite[];
  isSaving?: boolean;
}

/** Fields of the add/edit transaction form. State lives in useTransactionForm; actions in the dialog footer. */
export default function TransactionForm({ id, form, currencyOptions, isSaving = false }: TransactionFormProps) {
  return (
    <form id={id} onSubmit={form.handleSubmit} className="space-y-6">
      <DetailsFields form={form} currencyOptions={currencyOptions} disabled={isSaving} />
      <AmountFields form={form} disabled={isSaving} />
      <RecurringFields form={form} disabled={isSaving} />
    </form>
  );
}

interface FieldGroupProps {
  form: TransactionFormState;
  disabled: boolean;
}

function DetailsFields({ form, currencyOptions, disabled }: FieldGroupProps & { currencyOptions: CurrencyOptionLite[] }) {
  const translation = translationHint(form);
  const categoryOptions = buildCategoryOptions(form);
  const selectedIcon = form.selectedCategory ? (
    <CategoryIcon name={form.selectedCategory.icon} width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
  ) : undefined;

  return (
    <>
      <Field label="Transaction Name" hint={translation}>
        {(control) => (
          <input
            {...control}
            type="text"
            value={form.name}
            onChange={(event) => form.setName(event.target.value)}
            disabled={disabled}
            className={inputClass}
            placeholder="Enter a name"
            title={form.name}
          />
        )}
      </Field>

      <Field label="Category">
        {(control) => (
          <FormSelect
            control={control}
            options={categoryOptions}
            value={form.selectedCategory?.id ?? NONE_VALUE}
            onChange={(value) => form.selectCategory(value === NONE_VALUE ? null : value)}
            placeholder="Select a category"
            selectedIcon={selectedIcon}
            disabled={disabled}
          />
        )}
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Date">
          {(control) => (
            <DateFieldButton
              control={control}
              value={form.date}
              onChange={form.setDate}
              placeholder="Select a date"
              disabled={disabled}
            />
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-ui font-medium text-secondary">Currency</span>
          <CurrencySelector
            options={currencyOptions}
            selectedCurrencyId={form.currencyId ?? null}
            onSelect={form.selectCurrency}
            disabled={disabled}
          />
        </div>
      </div>
    </>
  );
}

function AmountFields({ form, disabled }: FieldGroupProps) {
  const conversionHint = conversionNote(form);
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <span id="transaction-type-label" className="text-ui font-medium text-secondary">
          Type
        </span>
        <div
          role="radiogroup"
          aria-labelledby="transaction-type-label"
          className="flex h-10 gap-0.5 rounded-control border border-line bg-surface-inset p-0.5"
        >
          <TypeOption type="income" form={form} disabled={disabled} />
          <TypeOption type="expense" form={form} disabled={disabled} />
        </div>
      </div>

      <Field label="Amount" hint={conversionHint}>
        {(control) => (
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body font-semibold text-fg">
              {form.selectedCurrency.symbol}
            </span>
            <input
              {...control}
              type="text"
              inputMode="decimal"
              value={form.amountInput}
              onChange={(event) => form.setAmountInput(event.target.value)}
              disabled={disabled}
              className={cx(inputClass, 'pl-8 tabular-nums')}
              placeholder="0.00"
            />
          </div>
        )}
      </Field>
    </div>
  );
}

function TypeOption({ type, form, disabled }: FieldGroupProps & { type: TransactionType }) {
  const isSelected = form.transactionType === type;
  const isIncome = type === 'income';
  const Icon = isIncome ? Wallet : ShoppingBag;
  const selectedClass = isIncome ? 'bg-positive text-on-accent shadow-sm' : 'bg-negative text-on-accent shadow-sm';

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={() => form.setTransactionType(type)}
      disabled={disabled}
      className={cx(
        'flex flex-1 items-center justify-center gap-1.5 rounded-chip px-3 text-ui font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
        isSelected ? selectedClass : 'text-muted hover:text-fg',
      )}
    >
      <Icon width={14} height={14} strokeWidth={1.5} aria-hidden="true" />
      <span>{isIncome ? 'Income' : 'Expense'}</span>
    </button>
  );
}

function RecurringFields({ form, disabled }: FieldGroupProps) {
  const isEdit = form.mode === 'edit';
  const description = isEdit
    ? 'Auto-create on the next due date'
    : 'Starts on the date above. Auto-creates on the next due date.';

  return (
    <div className="flex flex-col gap-4 rounded-panel border border-line bg-surface-0 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p id="recurring-label" className="text-body font-medium">
            Recurring
          </p>
          <p className="text-helper">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.recurringEnabled}
          aria-labelledby="recurring-label"
          onClick={form.toggleRecurring}
          disabled={disabled || form.isExistingRecurring}
          className={cx(
            'h-6 w-12 shrink-0 rounded-full p-1 transition-colors cursor-pointer disabled:cursor-default',
            form.recurringEnabled ? 'bg-accent' : 'bg-surface-3',
          )}
        >
          <span
            className={cx(
              'block size-4 rounded-full bg-fg transition-transform',
              form.recurringEnabled && 'translate-x-6',
            )}
          />
        </button>
      </div>

      {form.recurringEnabled && (
        <div className={cx('grid grid-cols-1 gap-3', isEdit ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
          {isEdit && (
            <Field label="Start Date">
              {(control) => (
                <DateFieldButton
                  control={control}
                  value={form.recurringStartDate}
                  onChange={form.setRecurringStartDate}
                  placeholder="Select start date"
                  disabled={disabled}
                />
              )}
            </Field>
          )}

          <Field label="Frequency">
            {(control) => (
              <div className="grid grid-cols-5 gap-2">
                <input
                  {...control}
                  type="number"
                  min={1}
                  value={form.recurringInterval}
                  onChange={(event) => {
                    const interval = Number.parseInt(event.target.value, 10);
                    form.setRecurringInterval(interval || 1);
                  }}
                  disabled={disabled}
                  className={cx(inputClass, 'col-span-2 tabular-nums')}
                />
                <div className="col-span-3">
                  <FormSelect
                    control={{ id: `${control.id}-unit`, 'aria-describedby': undefined, 'aria-invalid': undefined }}
                    options={UNIT_OPTIONS}
                    value={form.recurringUnit}
                    onChange={(value) => form.setRecurringUnit(value as RecurringFrequencyUnit)}
                    placeholder="Unit"
                    disabled={disabled}
                    labelClassName="capitalize"
                  />
                </div>
              </div>
            )}
          </Field>

          <Field label="End Date (optional)">
            {(control) => (
              <DateFieldButton
                control={control}
                value={form.recurringEndDate}
                onChange={form.setRecurringEndDate}
                placeholder="No end date"
                disabled={disabled}
              />
            )}
          </Field>
        </div>
      )}
    </div>
  );
}

const NONE_VALUE = '__none__';

const UNIT_OPTIONS: FormSelectOption[] = (['day', 'week', 'month', 'year'] as const).map((unit) => ({
  value: unit,
  label: unit,
}));

function buildCategoryOptions(form: TransactionFormState): FormSelectOption[] {
  const none: FormSelectOption = { value: NONE_VALUE, label: 'None' };
  const categories = form.typeCategories.map((category) => ({
    value: category.id,
    label: category.name,
    icon: <CategoryIcon name={category.icon} width={20} height={20} strokeWidth={1.5} aria-hidden="true" />,
  }));
  return [none, ...categories];
}

/** Shows the English translation under the name when the original is Georgian. */
function translationHint(form: TransactionFormState) {
  const { transaction } = form;
  const original = transaction.originalDescription || transaction.name;
  const translated = transaction.fullName || transaction.name;
  const hasGeorgian = /[Ⴀ-ჿ]/.test(original || '');
  const differs = Boolean(original?.trim()) && Boolean(translated?.trim()) && original !== translated;
  if (!hasGeorgian || !differs) return undefined;

  return (
    <span className="flex min-w-0 items-center gap-1.5 text-secondary">
      <Language width={14} height={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
      <span className="truncate" title={translated}>
        {translated}
      </span>
    </span>
  );
}

/** "About $X in your currency" when the transaction was stored in another currency. */
function conversionNote(form: TransactionFormState) {
  const { transaction, currencyId, userCurrency } = form;
  const hasConversion =
    currencyId &&
    currencyId !== userCurrency.id &&
    transaction.originalAmount !== undefined &&
    Math.abs(transaction.amount) !== Math.abs(transaction.originalAmount);
  if (!hasConversion) return undefined;

  const converted = formatMoney(Math.abs(transaction.amount), userCurrency.symbol);
  return <span className="tabular-nums">≈ {converted} in your currency</span>;
}
