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
  NavArrowDown,
  Plus,
  Minus
} from 'iconoir-react';
import { Investment } from '@/types/dashboard';
import { CalendarPanel } from '@/components/transactions/shared/CalendarPanel';
import CurrencySelector from '@/components/transactions/import/CurrencySelector';
import { CurrencyOption } from '@/components/transactions/import/CurrencySelector';
import { formatDateForDisplay, formatDateToInput } from '@/lib/dateFormatting';
import Spinner from '@/components/ui/Spinner';
import { useCurrency } from '@/hooks/useCurrency';

interface InvestmentFormProps {
  mode: 'add';
  initialAsset?: {
    name: string;
    ticker: string;
    assetType: 'crypto' | 'stock' | 'property' | 'custom';
    coingeckoId?: string;
    icon?: string;
  };
  onSave: (data: any) => void;
  onCancel: () => void;
  currencyOptions: CurrencyOption[];
  isSaving?: boolean;
  onFloatingPanelToggle?: (isOpen: boolean) => void;
}

type Step = 'type_selection' | 'search' | 'details';

export default function InvestmentForm({
  mode,
  initialAsset,
  onSave,
  onCancel,
  currencyOptions,
  isSaving = false,
  onFloatingPanelToggle,
}: InvestmentFormProps) {
  const { currency } = useCurrency();
  const [step, setStep] = useState<Step>(initialAsset ? 'details' : 'type_selection');

  // Form State
  const [formState, setFormState] = useState({
    name: initialAsset?.name || '',
    ticker: initialAsset?.ticker || '',
    assetType: initialAsset?.assetType || 'crypto' as 'crypto' | 'stock' | 'property' | 'custom',
    investmentType: 'buy' as 'buy' | 'sell',
    quantity: '',
    pricePerUnit: '',
    date: '',
    coingeckoId: initialAsset?.coingeckoId || '',
    pricingMode: 'manual' as 'live' | 'manual',
    currencyId: null as number | null,
    subtitle: '',
    icon: initialAsset?.icon || 'BitcoinCircle',
  });

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

  useEffect(() => {
    onFloatingPanelToggle?.(isDateOpen);
  }, [isDateOpen, onFloatingPanelToggle]);

  const updateDateDropdownPosition = useCallback(() => {
    if (!isDateOpen || !dateTriggerRef.current || !datePortalRef.current) return;
    const margin = 8;
    const triggerRect = dateTriggerRef.current.getBoundingClientRect();
    const dropdownRect = datePortalRef.current.getBoundingClientRect();

    setDateDropdownStyle({
      position: 'fixed',
      minWidth: '320px',
      width: 'max-content',
      left: Math.max(8, Math.min(triggerRect.left, window.innerWidth - 340)),
      top: triggerRect.bottom + margin,
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

  const handleSelectAsset = (asset: any) => {
    let coingeckoId = '';
    let pricingMode = 'manual';

    if (asset.id.startsWith('coingecko:')) {
      coingeckoId = asset.id.replace('coingecko:', '');
      pricingMode = 'live';
    } else if (asset.id.startsWith('stooq:')) {
      pricingMode = 'live';
    }

    setFormState((s) => ({
      ...s,
      name: asset.name,
      ticker: (asset.ticker || asset.symbol || '').toUpperCase(),
      assetType: asset.type,
      coingeckoId,
      pricingMode: pricingMode as any,
      pricePerUnit: asset.price ? asset.price.toString() : '',
      icon: asset.icon,
    }));
    setStep('details');
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
      pricePerUnit: Number(formState.pricePerUnit),
      currencyId: formState.currencyId || currency.id,
      date: formState.date || new Date().toISOString(),
    });
  };

  const targetSymbol = currency?.symbol || '$';

  return (
    <div className="flex flex-col h-full bg-[#282828]">
      <div className={`flex-1 px-6 py-6 space-y-6 custom-scrollbar ${isDateOpen ? 'overflow-visible' : 'overflow-y-auto'}`}>

        {/* STEP 1: TYPE */}
        {step === 'type_selection' && (
          <div className="space-y-6">
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

            {(formState.assetType === 'custom' || formState.assetType === 'property') && (
              <div>
                <label className="block text-body font-medium mb-2">Name</label>
                <input
                  className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
                  value={formState.name}
                  onChange={(e) => setFormState(s => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. My Apartment"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SEARCH */}
        {step === 'search' && (
          <div className="space-y-5">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-helper" width={20} height={20} />
              <input
                className="w-full px-12 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={formState.assetType === 'crypto' ? 'Search BTC, Ethereum...' : 'Search AAPL, TSLA...'}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <h4 className="text-helper text-xs uppercase tracking-wider ml-1">Results</h4>
              <div className="rounded-xl border border-[#3a3a3a] bg-[#202020] divide-y divide-[#2a2a2a] overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
                {searchLoading ? (
                  <div className="p-8 flex flex-col items-center justify-center text-helper">
                    <Spinner size={24} />
                    <span className="mt-2 text-xs">Searching...</span>
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

        {/* STEP 3: DETAILS */}
        {step === 'details' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{formState.name || 'New Investment'}</h3>
              {formState.ticker && <span className="text-xs bg-[#3a3a3a] px-2 py-1 rounded text-[#E7E4E4]">{formState.ticker}</span>}
            </div>

            <div className="grid grid-cols-2 bg-[#202020] p-1 rounded-xl border border-[#3a3a3a]">
              <button
                type="button"
                onClick={() => setFormState(s => ({ ...s, investmentType: 'buy' }))}
                className={`py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${formState.investmentType === 'buy' ? 'bg-[#74C648] text-[#202020]' : 'text-helper hover:text-white'
                  }`}
              >
                <Plus width={16} height={16} strokeWidth={2.5} /> Buy
              </button>
              <button
                type="button"
                onClick={() => setFormState(s => ({ ...s, investmentType: 'sell' }))}
                className={`py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${formState.investmentType === 'sell' ? 'bg-[#D93F3F] text-white' : 'text-helper hover:text-white'
                  }`}
              >
                <Minus width={16} height={16} strokeWidth={2.5} /> Sell
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-body font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  step="any"
                  className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
                  value={formState.quantity}
                  onChange={(e) => setFormState(s => ({ ...s, quantity: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-body font-medium mb-2">Price per Unit</label>
                <input
                  type="number"
                  step="any"
                  className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
                  value={formState.pricePerUnit}
                  onChange={(e) => setFormState(s => ({ ...s, pricePerUnit: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div ref={dateDropdownRef}>
                <label className="block text-body font-medium mb-2">Date</label>
                <button
                  type="button"
                  ref={dateTriggerRef}
                  onClick={() => setIsDateOpen(!isDateOpen)}
                  className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] text-left hover:border-[#AC66DA] transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className={formState.date ? 'text-primary' : 'text-helper'}>
                    {formState.date ? formatDateForDisplay(formState.date) : 'Today'}
                  </span>
                  <NavArrowDown className="text-helper" width={16} />
                </button>
                {isDateOpen && typeof document !== 'undefined' && createPortal(
                  <div
                    ref={datePortalRef}
                    className="rounded-2xl shadow-lg border border-[#3a3a3a] overflow-hidden bg-[#202020]"
                    style={dateDropdownStyle ?? { display: 'none' }}
                  >
                    <CalendarPanel
                      selectedDate={formState.date}
                      currentMonth={calendarMonth}
                      onChange={(date) => { setFormState((s) => ({ ...s, date })); setIsDateOpen(false); }}
                      onMonthChange={setCalendarMonth}
                    />
                  </div>,
                  document.body
                )}
              </div>

              <div>
                <label className="block text-body font-medium mb-2">Currency</label>
                <CurrencySelector
                  options={currencyOptions}
                  selectedCurrencyId={formState.currencyId}
                  onSelect={(id) => setFormState((s) => ({ ...s, currencyId: id }))}
                />
              </div>
            </div>

            {formState.quantity && formState.pricePerUnit && (
              <div className="flex items-center justify-between p-4 bg-[#202020] rounded-xl border border-[#3a3a3a]">
                <span className="text-helper text-xs uppercase">Total {formState.investmentType === 'buy' ? 'Cost' : 'Value'}</span>
                <span className="text-lg font-bold text-primary">
                  {targetSymbol}{(Number(formState.quantity) * Number(formState.pricePerUnit)).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-[#3a3a3a] bg-[#282828]">
        <button onClick={onCancel} className="px-5 py-2 rounded-xl text-sm font-medium border border-[#3a3a3a] hover:bg-[#323232] cursor-pointer">
          Cancel
        </button>
        {step !== 'details' ? (
          <div className="flex gap-2">
            {step === 'search' && <button onClick={handleBack} className="px-5 py-2 rounded-xl text-sm font-medium border border-[#3a3a3a] hover:bg-[#323232] cursor-pointer">Back</button>}
            <button onClick={handleNext} className="px-6 py-2 rounded-xl text-sm font-bold bg-[#AC66DA] text-white hover:bg-[#9A4FB8] cursor-pointer">
              Next
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleBack} className="px-5 py-2 rounded-xl text-sm font-medium border border-[#3a3a3a] hover:bg-[#323232] cursor-pointer">Back</button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !formState.quantity || !formState.pricePerUnit}
              className="px-8 py-2 rounded-xl text-sm font-bold bg-[#AC66DA] text-white hover:bg-[#9A4FB8] flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <><Spinner size={16} color="white" /><span>Saving...</span></> : 'Confirm Transaction'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
