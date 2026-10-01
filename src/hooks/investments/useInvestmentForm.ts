'use client';

import { useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { getDerivedAssetIcon } from '@/lib/asset-utils';
import type { Investment } from '@/types/dashboard';
import type { InvestmentAssetType, InvestmentCreatePayload, InvestmentSearchResultAsset } from '@/types/investments';
import type { CurrencyOption } from '@/components/transactions/import/CurrencySelector';

export type InvestmentFormStep = 'type_selection' | 'search' | 'details';

export interface InvestmentFormInitialAsset {
  name: string;
  ticker?: string | null;
  assetType?: InvestmentAssetType;
  coingeckoId?: string;
  icon?: string;
}

export interface InvestmentFormState {
  name: string;
  ticker: string;
  assetType: InvestmentAssetType;
  investmentType: 'buy' | 'sell';
  quantity: string;
  pricePerUnit: string;
  date: string;
  coingeckoId: string;
  pricingMode: 'live' | 'manual';
  currencyId: number | null;
  subtitle: string;
  icon: string;
}

/** Holdings within this tolerance of zero count as sold out (float noise from many partial sells). */
const QUANTITY_EPSILON = 0.00000001;

/**
 * State for the add-investment wizard: type, search, then details. Available quantity and the
 * Buy/Sell side are derived from `portfolio`, so a not-owned asset can only be bought.
 */
export function useInvestmentForm(
  initialAsset: InvestmentFormInitialAsset | undefined,
  portfolio: Investment[],
  currencyOptions: CurrencyOption[],
) {
  const { currency } = useCurrency();
  const [step, setStep] = useState<InvestmentFormStep>(initialAsset ? 'details' : 'type_selection');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState<InvestmentFormState>(() => initialState(initialAsset, currency?.id ?? null));

  const update = (patch: Partial<InvestmentFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const holding = step === 'details' ? findHolding(portfolio, form.name, form.ticker) : undefined;
  const availableQuantity = holding?.quantity ?? 0;
  const ownsAsset = availableQuantity > 0;
  const investmentType = ownsAsset ? form.investmentType : 'buy';
  const quantity = Number(form.quantity);
  const exceedsHoldings = investmentType === 'sell' && quantity > availableQuantity + QUANTITY_EPSILON;
  const canSubmit = Boolean(form.quantity) && Boolean(form.pricePerUnit) && !exceedsHoldings;

  const chooseAssetType = (assetType: InvestmentAssetType) => {
    update({
      assetType,
      name: '',
      ticker: '',
      coingeckoId: '',
      pricingMode: 'manual',
      pricePerUnit: '',
      icon: TYPE_ICON[assetType],
    });
  };

  const selectSearchResult = (asset: InvestmentSearchResultAsset) => {
    const usd = currencyOptions.find((option) => option.alias === 'USD');
    const isMarketAsset = asset.type === 'crypto' || asset.type === 'stock';
    setForm((prev) => ({
      ...prev,
      name: asset.name,
      ticker: (asset.ticker || asset.symbol || '').toUpperCase(),
      assetType: asset.type,
      coingeckoId: asset.id.startsWith('coingecko:') ? asset.id.replace('coingecko:', '') : '',
      pricingMode: isLiveSource(asset.id) ? 'live' : 'manual',
      pricePerUnit: asset.price ? asset.price.toString() : '',
      icon: asset.icon,
      currencyId: isMarketAsset && usd ? usd.id : prev.currencyId,
    }));
    setStep('details');
  };

  const goNext = () => {
    if (step !== 'type_selection') return;
    setStep(isSearchable(form.assetType) ? 'search' : 'details');
  };

  const goBack = () => {
    if (step === 'search') {
      setStep('type_selection');
      setSearchQuery('');
      return;
    }
    if (step !== 'details') return;
    if (!initialAsset) {
      update({
        name: '',
        ticker: '',
        pricePerUnit: '',
        coingeckoId: '',
        pricingMode: 'manual',
        icon: getDerivedAssetIcon(form.assetType, null, 'manual'),
      });
    }
    if (isSearchable(form.assetType)) {
      setStep('search');
      setSearchQuery('');
    } else {
      setStep('type_selection');
    }
  };

  const toPayload = (): InvestmentCreatePayload => ({
    ...form,
    investmentType,
    ticker: form.ticker || null,
    quantity,
    pricePerUnit: Number(form.pricePerUnit),
    currencyId: form.currencyId || currency.id,
    date: form.date || new Date().toISOString(),
  });

  return {
    step,
    setStep,
    form,
    update,
    investmentType,
    searchQuery,
    setSearchQuery,
    availableQuantity,
    ownsAsset,
    exceedsHoldings,
    canSubmit,
    chooseAssetType,
    selectSearchResult,
    goNext,
    goBack,
    toPayload,
  };
}

const TYPE_ICON: Record<InvestmentAssetType, string> = {
  crypto: 'BitcoinCircle',
  stock: 'Cash',
  property: 'Neighbourhood',
  custom: 'ViewGrid',
};

function initialState(initialAsset: InvestmentFormInitialAsset | undefined, currencyId: number | null): InvestmentFormState {
  return {
    name: initialAsset?.name || '',
    ticker: initialAsset?.ticker || '',
    assetType: initialAsset?.assetType || 'crypto',
    investmentType: 'buy',
    quantity: '',
    pricePerUnit: '',
    date: new Date().toISOString(),
    coingeckoId: initialAsset?.coingeckoId || '',
    pricingMode: 'manual',
    currencyId,
    subtitle: '',
    icon: initialAsset?.icon || 'BitcoinCircle',
  };
}

function isSearchable(assetType: InvestmentAssetType): boolean {
  return assetType === 'crypto' || assetType === 'stock';
}

function isLiveSource(searchId: string): boolean {
  return searchId.startsWith('coingecko:') || searchId.startsWith('stock:');
}

function findHolding(portfolio: Investment[], name: string, ticker: string): Investment | undefined {
  if (!name && !ticker) return undefined;
  const lowerName = name.toLowerCase();
  return portfolio.find((asset) => (ticker && asset.ticker === ticker) || asset.name.toLowerCase() === lowerName);
}
