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
  Minus,
  FloppyDisk
} from 'iconoir-react';
import { Investment } from '@/types/dashboard';
import { CalendarPanel } from '@/components/transactions/shared/CalendarPanel';
import CurrencySelector from '@/components/transactions/import/CurrencySelector';
import { CurrencyOption } from '@/components/transactions/import/CurrencySelector';
import { formatDateForDisplay, formatDateToInput } from '@/lib/dateFormatting';
import Spinner from '@/components/ui/Spinner';
import { useCurrency } from '@/hooks/useCurrency';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { formatNumber, formatSmartNumber } from '@/lib/utils';
import AssetLogo from './AssetLogo';
import { getDerivedAssetIcon } from '@/lib/asset-utils';
import { useToast } from '@/contexts/ToastContext';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#3a3a3a] rounded-xl ${className}`} />;
}

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
  portfolio?: Investment[];
}

type Step = 'type_selection' | 'search' | 'details';

const EMPTY_PORTFOLIO: Investment[] = [];

export default function InvestmentForm({
  mode,
  initialAsset,
  onSave,
  onCancel,
  currencyOptions: propCurrencyOptions,
  isSaving = false,
  onFloatingPanelToggle,
  portfolio = EMPTY_PORTFOLIO,
}: InvestmentFormProps) {
  const { currency } = useCurrency();
  const { currencyOptions, rates: prefetchRates } = useCurrencyOptions();
  const { addToast } = useToast();
  const [step, setStep] = useState<Step>(initialAsset ? 'details' : 'type_selection');

  // Form State
  const [formState, setFormState] = useState({
    name: initialAsset?.name || '',
    ticker: initialAsset?.ticker || '',
    assetType: initialAsset?.assetType || 'crypto' as 'crypto' | 'stock' | 'property' | 'custom',
    investmentType: 'buy' as 'buy' | 'sell',
    quantity: '',
    pricePerUnit: '',
    date: new Date().toISOString(),
    coingeckoId: initialAsset?.coingeckoId || '',
    pricingMode: 'manual' as 'live' | 'manual',
    currencyId: currency?.id || null,
    subtitle: '',
    icon: initialAsset?.icon || 'BitcoinCircle',
  });

  const [availableQuantity, setAvailableQuantity] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

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
      const res = await fetch(`/api/investments/search?q=${encodeURIComponent(searchQuery)}&type=${formState.assetType}`);
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

  // Fetch conversion rate when currency or date changes
  useEffect(() => {
    const isToday = !formState.date || formState.date.split('T')[0] === new Date().toISOString().split('T')[0];

    const fetchRate = async () => {
      if (!formState.currencyId || !currency?.id || formState.currencyId === currency.id) {
        setConversionRate(null);
        return;
      }

      // If date is today or not set, and we have pre-fetched rates, use them
      if (isToday && prefetchRates[formState.currencyId]) {
        setConversionRate(prefetchRates[formState.currencyId]);
        return;
      }

      setIsLoadingRate(true);
      try {
        const res = await fetch(`/api/exchange-rate?from=${formState.currencyId}&to=${currency.id}&date=${formState.date || new Date().toISOString()}`);
        if (res.ok) {
          const data = await res.json();
          setConversionRate(data.rate);
        }
      } catch (error) {
        console.error('Failed to fetch rate:', error);
      } finally {
        setIsLoadingRate(false);
      }
    };

    const debounce = setTimeout(fetchRate, isToday ? 0 : 500);
    return () => clearTimeout(debounce);
  }, [formState.currencyId, currency?.id, formState.date, prefetchRates, step]);

  useEffect(() => {
    onFloatingPanelToggle?.(isDateOpen);
  }, [isDateOpen, onFloatingPanelToggle]);

  // Determine if the selected asset is already in our portfolio
  // This is used to decide if we can sell it
  useEffect(() => {
    if (step === 'details' && (formState.name || formState.ticker)) {
      const portfolioAsset = portfolio.find((a: any) => 
        (formState.ticker && a.ticker === formState.ticker) || 
        (a.name.toLowerCase() === formState.name.toLowerCase())
      );
      
      if (portfolioAsset) {
        setAvailableQuantity(portfolioAsset.quantity || 0);
      } else {
        setAvailableQuantity(0);
        // If it's a new asset, force to Buy mode
        setFormState(prev => ({ ...prev, investmentType: 'buy' }));
      }
    }
  }, [step, formState.name, formState.ticker, portfolio]);

  const updateDateDropdownPosition = useCallback(() => {
    if (!isDateOpen || !dateTriggerRef.current || !datePortalRef.current) return;
    const margin = 8;
    const triggerRect = dateTriggerRef.current.getBoundingClientRect();
    const dropdownRect = datePortalRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const shouldOpenUp = (dropdownRect.height || 340) + margin > spaceBelow && spaceAbove > spaceBelow;

    const top = shouldOpenUp
      ? Math.max(margin, triggerRect.top - (dropdownRect.height || 340) - margin)
      : Math.min(window.innerHeight - (dropdownRect.height || 340) - margin, triggerRect.bottom + margin);

    const maxLeft = window.innerWidth - (dropdownRect.width || 320) - margin;
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

    // Default to USD for live assets if available
    const usdCurrency = propCurrencyOptions.find(c => c.alias === 'USD');

    setFormState((s) => ({
      ...s,
      name: asset.name,
      ticker: (asset.ticker || asset.symbol || '').toUpperCase(),
      assetType: asset.type,
      coingeckoId,
      pricingMode: pricingMode as any,
      pricePerUnit: asset.price ? asset.price.toString() : '',
      icon: asset.icon,
      currencyId: (asset.type === 'crypto' || asset.type === 'stock') && usdCurrency ? usdCurrency.id : s.currencyId,
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
      // Reset name, ticker and price when going back to search/type selection
      // This ensures a clean slate for the user
      if (!initialAsset) {
        setFormState(s => ({
          ...s,
          name: '',
          ticker: '',
          pricePerUnit: '',
          coingeckoId: '',
          pricingMode: 'manual',
          icon: getDerivedAssetIcon(s.assetType, null, 'manual')
        }));
      }

      if (formState.assetType === 'crypto' || formState.assetType === 'stock') {
        setStep('search');
        setSearchQuery('');
        setSearchResults([]);
      } else {
        setStep('type_selection');
      }
    } else if (step === 'search') {
      setStep('type_selection');
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formState.name) {
        addToast('Name is required', 'error');
        return;
    }

    onSave({
      ...formState,
      // Ticker is optional now for private assets
      ticker: formState.ticker || null, 
      quantity: Number(formState.quantity),
      pricePerUnit: Number(formState.pricePerUnit),
      currencyId: formState.currencyId || currency.id,
      date: formState.date || new Date().toISOString(),
    });
  };

  const selectedCurrency = currencyOptions.find(c => c.id === formState.currencyId) || currency;
  const targetSymbol = selectedCurrency?.symbol || '$';

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
                      // Reset live-asset specific fields when manually changing type
                      name: '',
                      ticker: '',
                      coingeckoId: '',
                      pricingMode: 'manual',
                      pricePerUnit: '',
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

        {/* STEP 2: SEARCH */}
        {step === 'search' && (
          <div className="space-y-5">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-helper" width={20} height={20} />
              <input
                className="w-full px-12 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={formState.assetType === 'crypto' ? 'Search BTC, Ethereum...' : 'Search AAPL, TSLA...'}
                autoFocus
                disabled={isSaving}
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
                          <AssetLogo 
                            src={asset.icon} 
                            size={18} 
                            fallback={getDerivedAssetIcon(asset.type, asset.ticker, 'manual')} 
                          />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-primary">{asset.name}</div>
                          <div className="text-[10px] text-helper uppercase">{asset.symbol}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {asset.price !== undefined && (
                          <div className="text-right mr-1">
                            <div className="text-sm font-bold text-primary">${formatSmartNumber(asset.price)}</div>
                            {(() => {
                              const usdId = propCurrencyOptions.find(c => c.alias === 'USD')?.id;
                              const rate = usdId ? prefetchRates[usdId] : null;
                              if (rate && currency && usdId !== currency.id) {
                                return (
                                  <div className="text-[10px] text-helper">
                                    ≈ {currency.symbol}{formatSmartNumber(asset.price * rate)}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                        <NavArrowRight className="text-helper opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" width={16} />
                      </div>
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
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-full bg-[#202020] flex items-center justify-center border border-[#3a3a3a] shrink-0">
                  <AssetLogo src={formState.icon} size={22} className="text-[#AC66DA]" />
                </div>
                <div className="flex-1">
                  {/* ========================================
                      MANUAL NAME INPUT DESIGN OPTIONS
                      Choose one version below
                  ======================================== */}
                  
                  {/* VERSION 1: Standard Input Field (ACTIVE) - Matches other form inputs */}
                  {(formState.assetType === 'property' || formState.assetType === 'custom') ? (
                    <div>
                      <input 
                        value={formState.name}
                        onChange={(e) => setFormState(s => ({ ...s, name: e.target.value }))}
                        disabled={isSaving}
                        className="w-full px-0 py-1 bg-transparent text-2xl font-bold border-0 border-b-2 border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ color: 'var(--text-primary)' }}
                        placeholder="Asset Name"
                      />
                    </div>
                  ) : (
                    <h3 className="text-lg font-bold">{formState.name || 'New Investment'}</h3>
                  )}

                  {/* VERSION 2: Inline Editable with Underline (COMMENTED OUT)
                  {(formState.assetType === 'property' || formState.assetType === 'custom') ? (
                    <input 
                      value={formState.name}
                      onChange={(e) => setFormState(s => ({ ...s, name: e.target.value }))}
                      className="text-lg font-bold bg-transparent border-b-2 border-[#3a3a3a] hover:border-[#AC66DA] focus:border-[#AC66DA] focus:outline-none w-full transition-colors placeholder:text-[#8C8C8C] pb-1"
                      style={{ color: 'var(--text-primary)' }}
                      placeholder="Asset Name"
                    />
                  ) : (
                    <h3 className="text-lg font-bold">{formState.name || 'New Investment'}</h3>
                  )}
                  */}

                  {/* VERSION 3: Subtle Background with Rounded Corners (COMMENTED OUT)
                  {(formState.assetType === 'property' || formState.assetType === 'custom') ? (
                    <input 
                      value={formState.name}
                      onChange={(e) => setFormState(s => ({ ...s, name: e.target.value }))}
                      className="text-lg font-bold bg-[#202020]/50 border border-transparent hover:border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none w-full transition-colors placeholder:text-[#8C8C8C] px-3 py-1.5 rounded-lg"
                      style={{ color: 'var(--text-primary)' }}
                      placeholder="Asset Name"
                    />
                  ) : (
                    <h3 className="text-lg font-bold">{formState.name || 'New Investment'}</h3>
                  )}
                  */}
                  
                  <div className="flex items-center gap-2 mt-1">
                    {formState.ticker && (
                      <span className="text-sm font-bold text-[#AC66DA] tracking-wider bg-[#AC66DA]/10 px-2 py-0.5 rounded uppercase">
                        {formState.ticker}
                      </span>
                    )}
                    {formState.assetType && (
                      <span className="text-xs text-helper capitalize">
                        • {formState.assetType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative bg-[#202020] border border-[#3a3a3a] rounded-xl p-0.5 flex gap-0.5 h-[42px]">
              <button
                type="button"
                onClick={() => setFormState(s => ({ ...s, investmentType: 'buy' }))}
                disabled={isSaving}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${formState.investmentType === 'buy'
                  ? 'bg-[#74C648] text-white shadow-sm'
                  : 'bg-transparent text-[#8C8C8C] hover:text-[#E7E4E4]'
                  }`}
              >
                <span>Buy</span>
              </button>
              <button
                type="button"
                onClick={() => setFormState(s => ({ ...s, investmentType: 'sell' }))}
                disabled={isSaving || (availableQuantity !== null && availableQuantity <= 0)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${formState.investmentType === 'sell'
                  ? 'bg-[#D93F3F] text-white shadow-sm'
                  : 'bg-transparent text-[#8C8C8C] hover:text-[#E7E4E4]'
                  }`}
                title={availableQuantity !== null && availableQuantity <= 0 ? "You don't own this asset" : ""}
              >
                <span>Sell</span>
              </button>
            </div>

            {/* Price/Quantity Section */}
            <div className={isSaving ? 'opacity-50 pointer-events-none' : ''}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-body font-medium mb-2">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    disabled={isSaving}
                    className={`w-full px-4 py-2 rounded-xl bg-[#202020] text-body border transition-colors disabled:cursor-not-allowed ${
                      formState.investmentType === 'sell' && availableQuantity !== null && Number(formState.quantity) > availableQuantity
                        ? 'border-[#D93F3F] focus:border-[#D93F3F]'
                        : 'border-[#3a3a3a] focus:border-[#AC66DA]'
                    }`}
                    value={formState.quantity}
                    onChange={(e) => setFormState(s => ({ ...s, quantity: e.target.value }))}
                    placeholder="0.00"
                  />
                  {formState.investmentType === 'sell' && (
                    <div className="mt-1.5 px-1 flex items-center justify-between">
                      <div className="text-[10px] text-helper flex items-center gap-1">
                         Available: {isLoadingBalance ? '...' : (availableQuantity !== null ? formatSmartNumber(availableQuantity) : '0')} {formState.ticker}
                      </div>
                      {availableQuantity !== null && Number(formState.quantity) > availableQuantity && (
                        <div className="text-[10px] text-[#D93F3F] font-bold">
                          Insufficient holdings
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-body font-medium mb-2">Price per Unit</label>
                  <input
                    type="number"
                    step="any"
                    disabled={isSaving}
                    className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors disabled:cursor-not-allowed"
                    value={formState.pricePerUnit}
                    onChange={(e) => setFormState(s => ({ ...s, pricePerUnit: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div ref={dateDropdownRef}>
                  <label className="block text-body font-medium mb-2">Date</label>
                  <button
                    type="button"
                    ref={dateTriggerRef}
                    onClick={() => setIsDateOpen(!isDateOpen)}
                    disabled={isSaving}
                    className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] text-left hover:border-[#AC66DA] transition-all flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={isSaving}
                  />
                </div>
              </div>

              {formState.quantity && formState.pricePerUnit && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-[#202020] rounded-xl border border-[#3a3a3a]">
                    <span className="text-helper text-xs uppercase">Total Cost</span>
                    <span className="text-lg font-bold text-primary">
                      {targetSymbol}{formatSmartNumber(Number(formState.quantity) * Number(formState.pricePerUnit))}
                    </span>
                  </div>

                  {formState.currencyId && currency?.id && formState.currencyId !== currency.id && (
                    <div className="p-4 rounded-xl bg-[#202020] border border-[#3a3a3a] min-h-[80px] flex flex-col justify-center">
                      {isLoadingRate ? (
                        <div className="space-y-3 animate-pulse">
                          <div className="flex justify-between items-center">
                            <div className="h-4 w-32 bg-[#3a3a3a] rounded-lg" />
                            <div className="h-6 w-24 bg-[#3a3a3a] rounded-lg" />
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="h-3 w-40 bg-[#3a3a3a] rounded-lg" />
                            <div className="h-3 w-28 bg-[#3a3a3a] rounded-lg" />
                          </div>
                        </div>
                      ) : (conversionRate !== null) ? (
                        <>
                          <div className="flex justify-between items-center text-sm mb-1.5">
                            <span style={{ color: 'var(--text-secondary)' }}>
                              Value at {formState.investmentType === 'buy' ? 'purchase' : 'sale'}
                            </span>
                            <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                              {currency.symbol}{formatSmartNumber((Number(formState.quantity) * Number(formState.pricePerUnit)) * conversionRate)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                            <span>Rate on {formState.date ? formatDateForDisplay(formState.date) : 'today'}</span>
                            <span>
                              1 {selectedCurrency?.alias} = {new Intl.NumberFormat('en-US', {
                                maximumFractionDigits: (conversionRate ?? 0) < 1 ? 6 : 4,
                                minimumFractionDigits: 2
                              }).format(conversionRate ?? 0)} {currency.alias}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-xs text-helper">
                          Rates unavailable for selected date.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#4a4a4a]"
            style={{
              backgroundColor: '#282828',
              color: 'var(--text-primary)',
              border: '1px solid #3a3a3a',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#323232';
              e.currentTarget.style.borderColor = '#4a4a4a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#282828';
              e.currentTarget.style.borderColor = '#3a3a3a';
            }}
          >
            Cancel
          </button>
          {step !== 'details' ? (
            <>
              {step === 'search' && (
                <button
                  onClick={handleBack}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#4a4a4a] flex items-center gap-2"
                  style={{
                    backgroundColor: '#282828',
                    color: 'var(--text-primary)',
                    border: '1px solid #3a3a3a',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#323232';
                    e.currentTarget.style.borderColor = '#4a4a4a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#282828';
                    e.currentTarget.style.borderColor = '#3a3a3a';
                  }}
                >
                  <NavArrowLeft width={16} height={16} /> Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#9A4FB8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-purple)';
                }}
              >
                Next
              </button>
            </>
          ) : (
            <>
              {(!initialAsset || step !== 'details') && (
                <button
                  onClick={handleBack}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#4a4a4a] flex items-center gap-2"
                  style={{
                    backgroundColor: '#282828',
                    color: 'var(--text-primary)',
                    border: '1px solid #3a3a3a',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#323232';
                    e.currentTarget.style.borderColor = '#4a4a4a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#282828';
                    e.currentTarget.style.borderColor = '#3a3a3a';
                  }}
                >
                  <NavArrowLeft width={16} height={16} /> Back
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={
                  isSaving || 
                  !formState.quantity || 
                  !formState.pricePerUnit || 
                  (formState.investmentType === 'sell' && availableQuantity !== null && Number(formState.quantity) > availableQuantity + 0.00000001)
                }
                className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#9A4FB8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-purple)';
                }}
              >
                {isSaving && <Spinner size={16} color="white" />}
                <FloppyDisk width={18} height={18} strokeWidth={1.5} />
                <span>Save Changes</span>
              </button>
            </>
          )}
        </div>
      </div>


    </div >
  );
}
