'use client';

import { useId, useState, type FormEvent } from 'react';
import { FloppyDisk, Trash } from 'iconoir-react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Field, { inputClass } from '@/components/ui/Field';
import { cx } from '@/components/ui/cx';
import AssetLogo from './AssetLogo';
import BuySellToggle from './BuySellToggle';
import ConversionPreview from './ConversionPreview';
import DateField from './DateField';
import CurrencySelector from '@/components/transactions/import/CurrencySelector';
import { useCurrency } from '@/hooks/useCurrency';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { useConversionRate } from '@/hooks/investments/useInvestmentQueries';
import { useTransactionEditForm } from '@/hooks/investments/useTransactionEditForm';
import { getDerivedAssetIcon } from '@/lib/asset-utils';
import { formatQuantity } from '@/lib/format';
import type { InvestmentTransactionEditState } from '@/types/investments';
import type { Investment } from '@/types/dashboard';

interface InvestmentTransactionModalProps {
  /** Mount with key={transaction.id}; the form reads its initial values once. */
  transaction: InvestmentTransactionEditState;
  onClose: () => void;
  onSave: (transaction: InvestmentTransactionEditState) => void;
  onDelete?: () => Promise<void> | void;
  isSaving?: boolean;
  isDeleting?: boolean;
  currencySymbol: string;
  /** Current holdings, used to block edits that would leave a negative quantity. */
  portfolio?: Investment[];
}

const EMPTY_PORTFOLIO: Investment[] = [];

/** Edit or delete one buy/sell transaction of an asset. */
export default function InvestmentTransactionModal({
  transaction,
  onClose,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
  currencySymbol: userCurrencySymbol,
  portfolio = EMPTY_PORTFOLIO,
}: InvestmentTransactionModalProps) {
  const formId = useId();
  const { currency: userCurrency } = useCurrency();
  const { currencyOptions, rates } = useCurrencyOptions();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const form = useTransactionEditForm(transaction, portfolio, userCurrency.id);
  const busy = isSaving || isDeleting;

  const { rate, loading: rateLoading } = useConversionRate({
    fromCurrencyId: form.currencyId,
    toCurrencyId: userCurrency.id,
    date: form.dateInput,
    prefetchedRates: rates,
  });

  const selectedCurrency = currencyOptions.find((option) => option.id === form.currencyId);
  const displaySymbol = selectedCurrency?.symbol || transaction.currency?.symbol || userCurrencySymbol;
  const isForeign = Boolean(form.currencyId && form.currencyId !== userCurrency.id);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.canSubmit || busy) return;
    const payload = form.toSavePayload();
    onSave(payload);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    if (!onDelete) return;
    await onDelete();
  };

  const footer = (
    <>
      {onDelete && (
        <Button
          variant="danger"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isSaving}
          loading={isDeleting}
          icon={<Trash width={16} height={16} strokeWidth={1.5} aria-hidden="true" />}
          className="sm:mr-auto"
        >
          Delete
        </Button>
      )}
      <Button variant="secondary" onClick={onClose} disabled={busy}>
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        loading={isSaving}
        disabled={isDeleting || !form.canSubmit}
        icon={<FloppyDisk width={18} height={18} strokeWidth={1.5} aria-hidden="true" />}
      >
        Save Changes
      </Button>
    </>
  );

  return (
    <>
      <Dialog open onClose={onClose} title="Edit Investment Transaction" size="lg" dismissible={!busy} footer={footer}>
        <form id={formId} onSubmit={handleSubmit} className="space-y-6">
          {transaction.assetName && <AssetSummary transaction={transaction} />}

          <BuySellToggle value={form.investmentType} onChange={form.setInvestmentType} disabled={busy} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Quantity"
              hint={`Current Portfolio: ${formatQuantity(form.currentHolding)} ${transaction.assetTicker ?? ''}`}
              error={form.goesNegative ? `Negative holding: ${formatQuantity(form.predictedHolding)}` : undefined}
            >
              {(controlProps) => (
                <input
                  {...controlProps}
                  type="text"
                  inputMode="decimal"
                  value={form.quantityInput}
                  onChange={(event) => form.setQuantityInput(event.target.value)}
                  disabled={busy}
                  className={cx(inputClass, 'tabular-nums')}
                  placeholder="0.00"
                />
              )}
            </Field>
            <Field label="Price Per Share">
              {(controlProps) => (
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui font-semibold text-fg">
                    {displaySymbol}
                  </span>
                  <input
                    {...controlProps}
                    type="text"
                    inputMode="decimal"
                    value={form.priceInput}
                    onChange={(event) => form.setPriceInput(event.target.value)}
                    disabled={busy}
                    className={cx(inputClass, 'pl-8 tabular-nums')}
                    placeholder="0.00"
                  />
                </div>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DateField label="Date" value={form.dateInput} onChange={form.setDateInput} disabled={busy} />
            <div className="flex flex-col gap-1.5">
              <span className="text-ui font-medium text-secondary">Currency</span>
              <CurrencySelector
                options={currencyOptions}
                selectedCurrencyId={form.currencyId}
                onSelect={form.setCurrencyId}
                disabled={busy}
              />
            </div>
          </div>

          {isForeign && (
            <ConversionPreview
              total={form.total}
              rate={rate}
              loading={rateLoading}
              side={form.investmentType}
              date={form.dateInput}
              fromAlias={selectedCurrency?.alias}
              to={userCurrency}
            />
          )}
        </form>
      </Dialog>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Transaction"
        message={
          <>
            Are you sure you want to delete this{' '}
            <span className="font-bold text-fg">{form.investmentType === 'buy' ? 'purchase' : 'sale'}</span> transaction for{' '}
            <span className="font-bold tabular-nums text-fg">
              {formatQuantity(transaction.quantity)} {transaction.assetTicker}
            </span>
            ?
            <br />
            <br />
            This action cannot be undone.
          </>
        }
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
}

function AssetSummary({ transaction }: { transaction: InvestmentTransactionEditState }) {
  const icon = transaction.icon || getDerivedAssetIcon(transaction.assetType, transaction.assetTicker, 'live');
  const fallback = getDerivedAssetIcon(transaction.assetType, transaction.assetTicker, 'manual');
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-0">
        <AssetLogo src={icon} size={22} className="text-accent" fallback={fallback} />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-lg font-bold">{transaction.assetName}</h3>
        <div className="flex items-center gap-2">
          {transaction.assetTicker && (
            <span className="rounded-chip bg-accent/10 px-2 py-0.5 text-ui font-bold uppercase tracking-wider text-accent-fg">
              {transaction.assetTicker}
            </span>
          )}
          {transaction.assetType && <span className="text-caption capitalize text-muted">• {transaction.assetType}</span>}
        </div>
      </div>
    </div>
  );
}
