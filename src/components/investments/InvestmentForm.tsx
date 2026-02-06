'use client';

import { useState, useCallback, useEffect, useRef, useLayoutEffect, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  Xmark,
  Search as SearchIcon,
  BitcoinCircle,
  Cash,
  Neighbourhood,
  NavArrowRight,
  NavArrowLeft,
  CheckCircle,
  ViewGrid,
  NavArrowDown
} from 'iconoir-react';
import { Investment } from '@/types/dashboard';
import { CalendarPanel } from '@/components/transactions/shared/CalendarPanel';
import CurrencySelector from '@/components/transactions/import/CurrencySelector';
import { CurrencyOption } from '@/components/transactions/import/CurrencySelector';
import { formatDateForDisplay, formatDateToInput } from '@/lib/dateFormatting';
import Spinner from '@/components/ui/Spinner';
import { useCurrency } from '@/hooks/useCurrency';

interface InvestmentFormProps {
  investment?: Investment;
  mode: 'add' | 'edit';
  onSave: (data: any) => void;
  onCancel: () => void;
  currencyOptions: CurrencyOption[];
  isSaving?: boolean;
  onFloatingPanelToggle?: (isOpen: boolean) => void;
}

type Step = 'type_selection' | 'search' | 'details';

export default function InvestmentForm({
  investment,
  mode,
  onSave,
  onCancel,
  currencyOptions,
  isSaving = false,
  onFloatingPanelToggle,
}: InvestmentFormProps) {
  const { currency } = useCurrency();
  const [step, setStep] = useState<Step>(mode === 'edit' ? 'details' : 'type_selection');
  const [formState, setFormState] = useState({
    name: investment?.name || '',
    ticker: investment?.ticker || '',
    assetType: investment?.assetType || 'custom',
    sourceId: investment?.sourceType === 'live' ? (investment?.assetType === 'crypto' ? `coingecko:${investment?.ticker}` : `stooq:${investment?.ticker}`) : '',
    quantity: investment?.quantity?.toString() || '1',
    purchasePrice: investment?.purchasePrice?.toString() || '',
    purchaseDate: investment?.purchaseDate ? formatDateToInput(investment.purchaseDate) : '',
    purchaseCurrencyId: investment?.purchaseCurrencyId || null,
    currentPrice: (investment?.currentValue && investment?.quantity) ? (investment.currentValue / investment.quantity).toFixed(2) : '',
    subtitle: investment?.subtitle || '',
    icon: investment?.icon || 'Cash',
  });

  const [loadingRates, setLoadingRates] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Portal refs and state for date picker
  const dateTriggerRef = useRef<HTMLButtonElement>(null);
  const datePortalRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const [dateDropdownStyle, setDateDropdownStyle] = useState<CSSProperties | null>(null);

  const isLive = formState.assetType === 'crypto' || formState.assetType === 'stock';

  const runSearch = useCallback(async () => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const res = await fetch(`/api/investments/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.assets || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (step === 'search') {
      const t = setTimeout(() => runSearch(), 300);
      return () => clearTimeout(t);
    }
  }, [searchQuery, runSearch, step]);

  // Notify parent about floating panel state
  useEffect(() => {
    onFloatingPanelToggle?.(isDateOpen);
  }, [isDateOpen, onFloatingPanelToggle]);

  // Position calculation for date dropdown portal
  const updateDateDropdownPosition = useCallback(() => {
    if (!isDateOpen || !dateTriggerRef.current || !datePortalRef.current) return;
    const margin = 8;
    const triggerRect = dateTriggerRef.current.getBoundingClientRect();
    const dropdownRect = datePortalRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const shouldOpenUp = dropdownRect.height + margin > spaceBelow && spaceAbove > spaceBelow;

    const top = shouldOpenUp
      ? Math.max(margin, triggerRect.top - dropdownRect.height - margin)
      : Math.min(window.innerHeight - dropdownRect.height - margin, triggerRect.bottom + margin);

    const maxLeft = window.innerWidth - dropdownRect.width - margin;
    const left = Math.min(Math.max(triggerRect.left, margin), Math.max(margin, maxLeft));

    setDateDropdownStyle({
      position: 'fixed',
      minWidth: '320px',
      width: 'max-content',
      left,
      top,
      zIndex: 1000,
    });
  }, [isDateOpen]);

  useLayoutEffect(() => {
    if (!isDateOpen) {
      setDateDropdownStyle(null);
      return;
    }

    updateDateDropdownPosition();
    window.addEventListener('resize', updateDateDropdownPosition);
    window.addEventListener('scroll', updateDateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDateDropdownPosition);
      window.removeEventListener('scroll', updateDateDropdownPosition, true);
    };
  }, [isDateOpen, updateDateDropdownPosition]);

  // Click outside handling for date picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (isDateOpen &&
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(target) &&
        (!datePortalRef.current || !datePortalRef.current.contains(target))) {
        setIsDateOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDateOpen]);

  // Currency normalization state
  const [rates, setRates] = useState({
    usdToTarget: 1,
    purchaseToTarget: 1,
  });

  // Fetch rates whenever currencies change
  useEffect(() => {
    const fetchRates = async () => {
      const targetId = currency.id;
      const purchaseId = formState.purchaseCurrencyId || targetId;
      const usdCurrency = currencyOptions.find(c => c.alias === 'USD') || currencyOptions.find(c => c.id === 1);
      const usdId = usdCurrency?.id || 1;

      try {
        const [usdRes, purRes] = await Promise.all([
          fetch(`/api/currencies/convert?from=${usdId}&to=${targetId}&amount=1`),
          fetch(`/api/currencies/convert?from=${purchaseId}&to=${targetId}&amount=1`)
        ]);

        const usdData = await usdRes.json();
        const purData = await purRes.json();

        setRates({
          usdToTarget: usdData.rate || 1,
          purchaseToTarget: purData.rate || 1,
        });
      } catch (err) {
        console.error('Failed to fetch conversion rates', err);
      } finally {
        setLoadingRates(false);
      }
    };

    if (currency.id && currencyOptions.length > 0) {
      fetchRates();
    }
  }, [currency.id, formState.purchaseCurrencyId, currencyOptions]);

  const handleSelectAsset = (asset: any) => {
    // Current price from search is in USD, convert to target currency
    const priceInTarget = asset.price ? asset.price * rates.usdToTarget : null;

    setFormState((s) => ({
      ...s,
      name: asset.name,
      ticker: (asset.ticker || asset.symbol || '').toUpperCase(),
      assetType: asset.type,
      sourceId: asset.id,
      subtitle: `${s.quantity || '1'} ${asset.ticker || asset.symbol}`,
      currentPrice: priceInTarget ? Number(priceInTarget).toFixed(2) : s.currentPrice,
      icon: asset.icon,
    }));
    setStep('details');
  };

  // Get selected currency for display
  const selectedCurrency = currencyOptions.find(c => c.id === formState.purchaseCurrencyId) || currency;
  const targetSymbol = currency?.symbol || '$';

  const profitPreview = (() => {
    const qty = Number(formState.quantity || 0);
    if (!qty) return null;

    // Prices as entered by user (Current price is expected to be in Target Currency per input label)
    const rawPurchasePrice = Number(formState.purchasePrice || 0);
    const normalizedCurrentPrice = Number(formState.currentPrice || 0);

    // Normalize Purchase Price to User Target Currency
    const normalizedPurchasePrice = rawPurchasePrice * rates.purchaseToTarget;

    const totalPurchaseValue = normalizedPurchasePrice * qty;
    const totalCurrentValue = normalizedCurrentPrice * qty;

    const profit = totalCurrentValue - totalPurchaseValue;
    const percent = totalPurchaseValue > 0 ? (profit / totalPurchaseValue) * 100 : 0;

    return { profit, percent, current: totalCurrentValue, purchase: totalPurchaseValue };
  })();

  const canGoNext = () => {
    if (step === 'type_selection') return formState.name && formState.assetType;
    if (step === 'search') return true;
    return true;
  };

  const handleNext = () => {
    if (step === 'type_selection') {
      if (formState.assetType === 'crypto' || formState.assetType === 'stock') {
        setStep('search');
      } else {
        setStep('details');
      }
    }
  };

  const handleBack = () => {
    if (step === 'details') {
      if (formState.assetType === 'crypto' || formState.assetType === 'stock') {
        setStep('search');
      } else {
        setStep('type_selection');
      }
    } else if (step === 'search') {
      setStep('type_selection');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formState,
      quantity: Number(formState.quantity),
      purchasePrice: formState.purchasePrice ? Number(formState.purchasePrice) : null,
      currentPrice: Number(formState.currentPrice),
      currentPriceCurrencyId: currency.id,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#282828]">
      <div className={`flex-1 px-6 py-6 space-y-6 custom-scrollbar ${isDateOpen ? 'overflow-visible' : 'overflow-y-auto'}`}>
        {step === 'type_selection' && (
          <div className="space-y-6">
            <div>
              <label className="block text-body font-medium mb-2">Investment Name</label>
              <input
                className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C]"
                value={formState.name}
                onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g., Bitcoin, Tesla Stock, London Apartment"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-body font-medium mb-2">Asset Type</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'crypto', label: 'Crypto', icon: BitcoinCircle },
                  { id: 'stock', label: 'Stock / ETF', icon: Cash },
                  { id: 'property', label: 'Property', icon: Neighbourhood },
                  { id: 'custom', label: 'Other', icon: ViewGrid },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormState((s) => ({
                      ...s,
                      assetType: opt.id as any,
                      icon: opt.id === 'crypto' ? 'BitcoinCircle' : opt.id === 'property' ? 'Neighbourhood' : opt.id === 'custom' ? 'ViewGrid' : 'Cash'
                    }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${formState.assetType === opt.id
                      ? 'border-[#AC66DA] bg-[#AC66DA]/10'
                      : 'border-[#3a3a3a] bg-[#202020] hover:border-[#4a4a4a]'
                      }`}
                  >
                    <opt.icon className={formState.assetType === opt.id ? 'text-[#AC66DA]' : 'text-helper'} width={20} height={20} strokeWidth={1.5} />
                    <span className={`text-body font-medium ${formState.assetType === opt.id ? 'text-[#E7E4E4]' : 'text-helper'}`}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'search' && (
          <div className="space-y-5">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-helper" width={20} height={20} />
              <input
                className="w-full px-12 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={formState.assetType === 'crypto' ? 'Search BTC, Ethereum...' : 'Search AAPL, TSLA...'}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <h4 className="text-helper text-xs uppercase tracking-wider ml-1">Search Results</h4>
              <div className="rounded-xl border border-[#3a3a3a] bg-[#202020] divide-y divide-[#2a2a2a] overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
                {searchLoading ? (
                  <div className="p-8 flex flex-col items-center justify-center text-helper">
                    <Spinner size={24} />
                    <span className="mt-2 text-xs">Searching markets...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => handleSelectAsset(asset)}
                      className="w-full text-left px-4 py-3 hover:bg-[#2a2a2a] transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center text-[#AC66DA]">
                          {asset.type === 'crypto' ? <BitcoinCircle width={18} height={18} /> : <Cash width={18} height={18} />}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-primary">{asset.name}</div>
                          <div className="text-[10px] text-helper uppercase">{asset.symbol}</div>
                        </div>
                      </div>
                      <NavArrowRight className="text-helper opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" width={16} />
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-helper text-xs">
                    {searchQuery.length < 2 ? 'Start typing to search...' : 'No assets found.'}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setStep('details')}
              className="w-full py-3 rounded-xl border border-dashed border-[#3a3a3a] text-helper hover:border-[#AC66DA] hover:text-[#E7E4E4] transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
            >
              Skip and enter details manually
              <NavArrowRight width={14} height={14} />
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-body font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  step="any"
                  className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
                  value={formState.quantity}
                  onChange={(e) => setFormState((s) => ({ ...s, quantity: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-body font-medium mb-2">
                  {isLive ? `Market Price` : `Current Price`}
                </label>
                {isLive ? (
                  <div className="w-full px-4 py-2 rounded-xl bg-[#2d2d2d] text-body border border-[#3a3a3a] flex items-center justify-between opacity-90">
                    <span className="font-bold text-sm">{targetSymbol}{Number(formState.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[10px] uppercase font-bold text-[#74C648] bg-[#74C648]/10 px-2 py-0.5 rounded-md">Live</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    step="any"
                    className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
                    value={formState.currentPrice}
                    onChange={(e) => setFormState((s) => ({ ...s, currentPrice: e.target.value }))}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-body font-medium mb-2">Purchase Price</label>
                <input
                  type="number"
                  step="any"
                  className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
                  value={formState.purchasePrice}
                  onChange={(e) => setFormState((s) => ({ ...s, purchasePrice: e.target.value }))}
                />
                {formState.purchasePrice && formState.purchaseCurrencyId && formState.purchaseCurrencyId !== currency.id && (
                  <div className="flex items-center gap-1 mt-1.5 ml-1">
                    <span className="text-[11px] text-helper">≈</span>
                    <span className="text-[11px] font-semibold text-[#74C648]">
                      {targetSymbol}{(Number(formState.purchasePrice) * rates.purchaseToTarget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-helper uppercase ml-0.5">{currency.alias}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-body font-medium mb-2">Currency</label>
                <CurrencySelector
                  options={currencyOptions}
                  selectedCurrencyId={formState.purchaseCurrencyId}
                  onSelect={(id) => setFormState((s) => ({ ...s, purchaseCurrencyId: id }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div ref={dateDropdownRef}>
                <label className="block text-body font-medium mb-2">Purchase Date</label>
                <button
                  type="button"
                  ref={dateTriggerRef}
                  onClick={() => setIsDateOpen(!isDateOpen)}
                  className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] text-left hover:border-[#AC66DA] transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className={formState.purchaseDate ? 'text-primary' : 'text-helper'}>
                    {formState.purchaseDate ? formatDateForDisplay(formState.purchaseDate) : 'Select Date'}
                  </span>
                  <NavArrowDown className="text-helper" width={16} />
                </button>

                {isDateOpen && typeof document !== 'undefined' && createPortal(
                  <div
                    ref={datePortalRef}
                    className="rounded-2xl shadow-lg border border-[#3a3a3a] overflow-hidden bg-[#202020]"
                    style={{
                      ...(dateDropdownStyle ?? { position: 'fixed', top: -9999, left: -9999, zIndex: 1000 }),
                    }}
                  >
                    <CalendarPanel
                      selectedDate={formState.purchaseDate}
                      currentMonth={calendarMonth}
                      onChange={(date) => { setFormState((s) => ({ ...s, purchaseDate: date })); setIsDateOpen(false); }}
                      onMonthChange={setCalendarMonth}
                    />
                  </div>,
                  document.body
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-body font-medium mb-2">Notes</label>
              <input
                className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C]"
                value={formState.subtitle}
                onChange={(e) => setFormState((s) => ({ ...s, subtitle: e.target.value }))}
                placeholder="Where is this held?"
              />
            </div>

            {profitPreview && (
              <div className="p-4 rounded-2xl bg-[#202020] border border-[#3a3a3a] flex flex-col gap-3 shadow-inner relative overflow-hidden">
                {loadingRates && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-10"><Spinner size={20} /></div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-helper text-xs uppercase tracking-wider">Total Value</span>
                  <span className="text-lg font-bold">{targetSymbol}{profitPreview.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-helper text-xs uppercase tracking-wider">Profit / Loss</span>
                  <div className={`flex items-center gap-2 ${profitPreview.profit >= 0 ? 'text-[#74C648]' : 'text-[#D93F3F]'}`}>
                    <span className="font-bold">{profitPreview.profit >= 0 ? '+' : '-'}{targetSymbol}{Math.abs(profitPreview.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-white/5">({profitPreview.percent.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-[#3a3a3a] bg-[#282828]">
        <button
          onClick={onCancel}
          className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border border-[#3a3a3a] bg-[#282828] text-primary hover:bg-[#323232]"
        >
          Cancel
        </button>
        {step !== 'details' ? (
          <div className="flex gap-2">
            {mode === 'add' && step !== 'type_selection' && (
              <button
                onClick={handleBack}
                className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border border-[#3a3a3a] bg-[#282828] text-primary hover:bg-[#323232]"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="px-6 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer bg-[#AC66DA] text-white disabled:opacity-50 disabled:grayscale hover:bg-[#9A4FB8]"
            >
              Next
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            {mode === 'add' && (
              <button
                onClick={handleBack}
                className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border border-[#3a3a3a] bg-[#282828] text-primary hover:bg-[#323232]"
              >
                Back
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={isSaving || !formState.name}
              className="px-8 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer bg-[#AC66DA] text-white disabled:opacity-50 flex items-center gap-2 hover:bg-[#9A4FB8]"
            >
              {isSaving ? <><Spinner size={16} color="white" /><span>Saving...</span></> : (mode === 'add' ? 'Add Investment' : 'Save Changes')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
