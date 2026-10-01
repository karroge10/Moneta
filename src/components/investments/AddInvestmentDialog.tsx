'use client';

import Dialog from '@/components/ui/Dialog';
import InvestmentForm from './InvestmentForm';
import type { CurrencyOption } from '@/components/transactions/import/CurrencySelector';
import type { Investment } from '@/types/dashboard';
import type { InvestmentCreatePayload, InvestmentForAddTransaction } from '@/types/investments';

interface AddInvestmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: InvestmentCreatePayload) => void;
  /** Prefills the form and skips straight to details, e.g. "Add Transaction" from an asset. */
  initialAsset: InvestmentForAddTransaction | null;
  currencyOptions: CurrencyOption[];
  portfolio: Investment[];
  isSaving: boolean;
}

/** Dialog around the add-investment wizard. Cannot be dismissed while saving. */
export default function AddInvestmentDialog({
  open,
  onClose,
  onSave,
  initialAsset,
  currencyOptions,
  portfolio,
  isSaving,
}: AddInvestmentDialogProps) {
  const prefill = initialAsset
    ? {
        name: initialAsset.name,
        ticker: initialAsset.ticker,
        assetType: initialAsset.assetType,
        icon: initialAsset.icon,
      }
    : undefined;

  return (
    <Dialog open={open} onClose={onClose} title="Add Investment Transaction" size="lg" dismissible={!isSaving}>
      <InvestmentForm
        key={initialAsset?.id ?? 'new'}
        initialAsset={prefill}
        onSave={onSave}
        onCancel={onClose}
        currencyOptions={currencyOptions}
        portfolio={portfolio}
        isSaving={isSaving}
      />
    </Dialog>
  );
}
