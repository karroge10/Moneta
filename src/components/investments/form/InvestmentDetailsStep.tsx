'use client';

import Field, { inputClass } from '@/components/ui/Field';
import { cx } from '@/components/ui/cx';
import AssetLogo from '@/components/investments/AssetLogo';
import BuySellToggle from '@/components/investments/BuySellToggle';
import ConversionPreview from '@/components/investments/ConversionPreview';
import DateField from '@/components/investments/DateField';
import CurrencySelector, { type CurrencyOption } from '@/components/transactions/import/CurrencySelector';
import { useConversionRate } from '@/hooks/investments/useInvestmentQueries';
import type { InvestmentFormState } from '@/hooks/investments/useInvestmentForm';
import { formatQuantity } from '@/lib/format';
import { formatSmartNumber } from '@/lib/utils';

interface InvestmentDetailsStepProps {
  form: InvestmentFormState;
  onChange: (patch: Partial<InvestmentFormState>) => void;
  investmentType: 'buy' | 'sell';
  ownsAsset: boolean;
  availableQuantity: number;
  exceedsHoldings: boolean;
  currencyOptions: CurrencyOption[];
  userCurrency: { id: number; symbol: string; alias: string };
  prefetchedRates: Record<number, number>;
  disabled: boolean;
}

/** Last wizard step: side, quantity, price, date, currency and the converted total. */
export default function InvestmentDetailsStep({
  form,
  onChange,
  investmentType,
  ownsAsset,
  availableQuantity,
  exceedsHoldings,
  currencyOptions,
  userCurrency,
  prefetchedRates,
  disabled,
}: InvestmentDetailsStepProps) {
  const { rate, loading: rateLoading } = useConversionRate({
    fromCurrencyId: form.currencyId,
    toCurrencyId: userCurrency.id,
    date: form.date,
    prefetchedRates,
  });

  const selectedCurrency = currencyOptions.find((option) => option.id === form.currencyId) ?? userCurrency;
  const total = Number(form.quantity) * Number(form.pricePerUnit);
  const hasTotal = Boolean(form.quantity && form.pricePerUnit);
  const isForeign = Boolean(form.currencyId && form.currencyId !== userCurrency.id);
  const isNamedByUser = form.assetType === 'property' || form.assetType === 'custom';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-0">
          <AssetLogo src={form.icon} size={22} className="text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          {isNamedByUser ? (
            <input
              value={form.name}
              onChange={(event) => onChange({ name: event.target.value })}
              disabled={disabled}
              aria-label="Asset name"
              placeholder="Asset Name"
              className="w-full border-0 border-b-2 border-line bg-transparent px-0 py-1 text-2xl font-bold text-fg transition-colors placeholder:text-muted focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          ) : (
            <h3 className="truncate text-lg font-bold">{form.name || 'New Investment'}</h3>
          )}
          <div className="mt-1 flex items-center gap-2">
            {form.ticker && (
              <span className="rounded-chip bg-accent/10 px-2 py-0.5 text-ui font-bold uppercase tracking-wider text-accent-fg">
                {form.ticker}
              </span>
            )}
            <span className="text-caption capitalize text-muted">• {form.assetType}</span>
          </div>
        </div>
      </div>

      <BuySellToggle
        value={investmentType}
        onChange={(side) => onChange({ investmentType: side })}
        disabled={disabled}
        sellDisabledReason={ownsAsset ? undefined : "You don't own this asset"}
      />

      <div className={cx('space-y-6', disabled && 'pointer-events-none opacity-50')}>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Quantity"
            error={exceedsHoldings ? 'Insufficient holdings' : undefined}
            hint={investmentType === 'sell' ? `Available: ${formatQuantity(availableQuantity)} ${form.ticker}` : undefined}
          >
            {(controlProps) => (
              <input
                {...controlProps}
                type="number"
                step="any"
                inputMode="decimal"
                disabled={disabled}
                className={cx(inputClass, 'tabular-nums')}
                value={form.quantity}
                onChange={(event) => onChange({ quantity: event.target.value })}
                placeholder="0.00"
              />
            )}
          </Field>
          <Field label="Price per Unit">
            {(controlProps) => (
              <input
                {...controlProps}
                type="number"
                step="any"
                inputMode="decimal"
                disabled={disabled}
                className={cx(inputClass, 'tabular-nums')}
                value={form.pricePerUnit}
                onChange={(event) => onChange({ pricePerUnit: event.target.value })}
                placeholder="0.00"
              />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DateField label="Date" value={form.date} onChange={(date) => onChange({ date })} disabled={disabled} placeholder="Today" />
          <div className="flex flex-col gap-1.5">
            <span className="text-ui font-medium text-secondary">Currency</span>
            <CurrencySelector
              options={currencyOptions}
              selectedCurrencyId={form.currencyId}
              onSelect={(currencyId) => onChange({ currencyId })}
              disabled={disabled}
            />
          </div>
        </div>

        {hasTotal && (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-control border border-line bg-surface-0 p-4">
              <span className="text-caption uppercase text-muted">Total Cost</span>
              <span className="text-lg font-bold tabular-nums text-fg">
                {selectedCurrency.symbol}
                {formatSmartNumber(total)}
              </span>
            </div>
            {isForeign && (
              <ConversionPreview
                total={total}
                rate={rate}
                loading={rateLoading}
                side={investmentType}
                date={form.date}
                fromAlias={selectedCurrency.alias}
                to={userCurrency}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
