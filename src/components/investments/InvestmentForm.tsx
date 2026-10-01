'use client';

import type { FormEvent } from 'react';
import { FloppyDisk, NavArrowLeft } from 'iconoir-react';
import Button from '@/components/ui/Button';
import AssetTypeStep from '@/components/investments/form/AssetTypeStep';
import AssetSearchStep from '@/components/investments/form/AssetSearchStep';
import InvestmentDetailsStep from '@/components/investments/form/InvestmentDetailsStep';
import type { CurrencyOption } from '@/components/transactions/import/CurrencySelector';
import { useCurrency } from '@/hooks/useCurrency';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { useInvestmentForm, type InvestmentFormInitialAsset } from '@/hooks/investments/useInvestmentForm';
import { useToast } from '@/contexts/ToastContext';
import type { Investment } from '@/types/dashboard';
import type { InvestmentCreatePayload } from '@/types/investments';

interface InvestmentFormProps {
  initialAsset?: InvestmentFormInitialAsset;
  onSave: (data: InvestmentCreatePayload) => void;
  onCancel: () => void;
  currencyOptions: CurrencyOption[];
  isSaving?: boolean;
  /** Current holdings; decides whether Sell is allowed and how much can be sold. */
  portfolio?: Investment[];
}

const EMPTY_PORTFOLIO: Investment[] = [];

/** Add-investment wizard: asset type, market search (crypto and stocks), then transaction details. */
export default function InvestmentForm({
  initialAsset,
  onSave,
  onCancel,
  currencyOptions: propCurrencyOptions,
  isSaving = false,
  portfolio = EMPTY_PORTFOLIO,
}: InvestmentFormProps) {
  const { currency } = useCurrency();
  const { currencyOptions, rates } = useCurrencyOptions();
  const { addToast } = useToast();
  const wizard = useInvestmentForm(initialAsset, portfolio, propCurrencyOptions);
  const { step, form } = wizard;

  const usdId = propCurrencyOptions.find((option) => option.alias === 'USD')?.id;
  const usdRate = usdId && usdId !== currency?.id ? (rates[usdId] ?? null) : null;
  const showBack = step === 'search' || (step === 'details' && !initialAsset);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (step !== 'details') {
      wizard.goNext();
      return;
    }
    if (!form.name) {
      addToast('Name is required', 'error');
      return;
    }
    const payload = wizard.toPayload();
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {step === 'type_selection' && <AssetTypeStep value={form.assetType} onChange={wizard.chooseAssetType} />}

      {step === 'search' && (
        <AssetSearchStep
          assetType={form.assetType}
          query={wizard.searchQuery}
          onQueryChange={wizard.setSearchQuery}
          onSelect={wizard.selectSearchResult}
          onSkip={() => wizard.setStep('details')}
          usdRate={usdRate}
          disabled={isSaving}
        />
      )}

      {step === 'details' && (
        <InvestmentDetailsStep
          form={form}
          onChange={wizard.update}
          investmentType={wizard.investmentType}
          ownsAsset={wizard.ownsAsset}
          availableQuantity={wizard.availableQuantity}
          exceedsHoldings={wizard.exceedsHoldings}
          currencyOptions={currencyOptions}
          userCurrency={currency}
          prefetchedRates={rates}
          disabled={isSaving}
        />
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        {showBack && (
          <Button variant="secondary" onClick={wizard.goBack} disabled={isSaving} icon={<NavArrowLeft width={16} height={16} aria-hidden="true" />}>
            Back
          </Button>
        )}
        {step === 'type_selection' && <Button type="submit">Next</Button>}
        {step === 'details' && (
          <Button
            type="submit"
            loading={isSaving}
            disabled={!wizard.canSubmit}
            icon={<FloppyDisk width={18} height={18} strokeWidth={1.5} aria-hidden="true" />}
          >
            Save Changes
          </Button>
        )}
      </div>
    </form>
  );
}
