'use client';

import { useEffect, useRef, useState, useCallback, useLayoutEffect, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Xmark, Trash, NavArrowDown, FloppyDisk } from 'iconoir-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatDateForDisplay, formatDateToInput } from '@/lib/dateFormatting';
import CurrencySelector from '@/components/transactions/import/CurrencySelector';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { formatNumber, formatSmartNumber } from '@/lib/utils';
import { CalendarPanel } from '@/components/transactions/shared/CalendarPanel';
import AssetLogo from './AssetLogo';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getDerivedAssetIcon } from '@/lib/asset-utils';
import { Investment } from '@/types/dashboard';

import Spinner from '@/components/ui/Spinner';

function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse bg-[#3a3a3a] rounded-xl ${className}`} />;
}

interface InvestmentTransaction {
    id: string;
    date: string;
    investmentType: 'buy' | 'sell';
    quantity: number;
    pricePerUnit: number;
    assetName?: string;
    assetTicker?: string;
    assetType?: string;
    icon?: string;
    name?: string;
    amount?: number;
    currency?: {
        symbol: string;
        alias: string;
        id: number;
    };
    currencyId?: number;
}

interface InvestmentTransactionModalProps {
    transaction: InvestmentTransaction | null;
    onClose: () => void;
    onSave: (transaction: InvestmentTransaction) => void;
    onDelete?: () => Promise<void> | void;
    isSaving?: boolean;
    isDeleting?: boolean;
    currencySymbol: string;
    portfolio?: Investment[];
}

const EMPTY_PORTFOLIO: Investment[] = [];

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
    const { currency: userCurrency } = useCurrency();
    const { currencyOptions, rates: prefetchRates } = useCurrencyOptions();
    const modalRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const pointerDownOnOverlay = useRef(false);

    const [formData, setFormData] = useState<InvestmentTransaction>(
        transaction || {
            id: '',
            date: '',
            investmentType: 'buy',
            quantity: 0,
            pricePerUnit: 0,
        }
    );
    const [dateInput, setDateInput] = useState('');
    const [quantityInput, setQuantityInput] = useState('');
    const [priceInput, setPriceInput] = useState('');
    const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | null>(null);
    const [conversionRate, setConversionRate] = useState<number | null>(null);
    const [isLoadingRate, setIsLoadingRate] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [availableQuantity, setAvailableQuantity] = useState<number | null>(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsInitialLoading(false), 300);
        return () => clearTimeout(timer);
    }, []);

    // Calendar state
    const [isDateOpen, setIsDateOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [dateDropdownStyle, setDateDropdownStyle] = useState<CSSProperties | null>(null);
    const dateTriggerRef = useRef<HTMLButtonElement>(null);
    const datePortalRef = useRef<HTMLDivElement>(null);
    const dateDropdownRef = useRef<HTMLDivElement>(null);

    // Initial load
    useEffect(() => {
        if (transaction) {
            setFormData(transaction);
            const initialDate = formatDateToInput(transaction.date) || '';
            setDateInput(initialDate);
            setQuantityInput(transaction.quantity.toString());
            setPriceInput(transaction.pricePerUnit.toString());
            setSelectedCurrencyId(transaction.currencyId || transaction.currency?.id || userCurrency.id);
            if (initialDate) {
                setCurrentMonth(new Date(initialDate));
            }

            // Use the passed portfolio data to find the current balance for this asset
            const portfolioAsset = portfolio.find((a: any) => 
                (transaction.assetTicker && a.ticker === transaction.assetTicker) || 
                (a.name.toLowerCase() === (transaction.assetName || '').toLowerCase())
            );
            
            if (portfolioAsset) {
                setAvailableQuantity(portfolioAsset.quantity || 0);
            } else {
                setAvailableQuantity(0);
            }
        }
    }, [transaction, userCurrency.id, portfolio]);

    // Calendar positioning logic
    const updateDateDropdownPosition = useCallback(() => {
        if (!isDateOpen || !dateTriggerRef.current || !datePortalRef.current) return;
        const margin = 8;
        const triggerRect = dateTriggerRef.current.getBoundingClientRect();
        const dropdownRect = datePortalRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        const dropdownHeight = dropdownRect.height || 340;
        const dropdownWidth = dropdownRect.width || 320;
        const shouldOpenUp = dropdownHeight + margin > spaceBelow && spaceAbove > spaceBelow;

        const top = shouldOpenUp
            ? Math.max(margin, triggerRect.top - dropdownHeight - margin)
            : Math.min(window.innerHeight - dropdownHeight - margin, triggerRect.bottom + margin);

        const maxLeft = window.innerWidth - dropdownWidth - margin;
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

    const handleDateSelect = (value: string) => {
        setDateInput(value);
        if (value) {
            setCurrentMonth(new Date(value));
        }
        setIsDateOpen(false);
    };

    // Fetch conversion rate when currency changes
    useEffect(() => {
        const isToday = !dateInput || dateInput === new Date().toISOString().split('T')[0];

        const fetchRate = async () => {
            if (!selectedCurrencyId || !userCurrency.id || selectedCurrencyId === userCurrency.id) {
                setConversionRate(null);
                return;
            }

            // If date is today or not set, and we have pre-fetched rates, use them
            if (isToday && prefetchRates[selectedCurrencyId]) {
                setConversionRate(prefetchRates[selectedCurrencyId]);
                return;
            }

            setIsLoadingRate(true);
            try {
                const res = await fetch(`/api/exchange-rate?from=${selectedCurrencyId}&to=${userCurrency.id}&date=${dateInput || new Date().toISOString()}`);
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
    }, [selectedCurrencyId, userCurrency.id, dateInput, prefetchRates]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isSaving && !isDeleting) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        };
    }, [onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const quantity = parseFloat(quantityInput) || 0;
        const pricePerUnit = parseFloat(priceInput) || 0;
        const totalAmount = quantity * pricePerUnit;
        // In Moneta, buy is an expense (negative), sell is an income (positive)
        const amount = formData.investmentType === 'buy' ? -totalAmount : totalAmount;
        const name = `${formData.investmentType === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${formData.assetTicker || formData.assetName || 'Asset'}`;

        onSave({
            ...formData,
            name,
            amount,
            date: dateInput,
            quantity,
            pricePerUnit,
            currencyId: selectedCurrencyId || undefined,
        });
    };

    if (!transaction) return null;

    const selectedCurrency = currencyOptions.find(c => c.id === selectedCurrencyId);
    const displaySymbol = selectedCurrency?.symbol || transaction.currency?.symbol || userCurrencySymbol;
    const isDifferentCurrency = selectedCurrencyId && selectedCurrencyId !== userCurrency.id;

    // Calculate converted total amount
    const totalAmount = (parseFloat(quantityInput) || 0) * (parseFloat(priceInput) || 0);
    const convertedTotal = conversionRate ? totalAmount * conversionRate : null;

    return (
        <>
            <div
                ref={overlayRef}
                className="fixed inset-0 bg-black/60 z-[60] animate-in fade-in duration-200"
                onMouseDown={() => {
                    pointerDownOnOverlay.current = true;
                }}
                onMouseUp={() => {
                    if (pointerDownOnOverlay.current && overlayRef.current && !isSaving && !isDeleting) {
                        onClose();
                    }
                    pointerDownOnOverlay.current = false;
                }}
            />
            <div
                ref={modalRef}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in zoom-in-95 duration-200 pointer-events-none"
            >
                <div
                    className="w-full max-w-2xl max-h-[94vh] rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col pointer-events-auto"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                    onMouseDown={() => {
                        pointerDownOnOverlay.current = false;
                    }}
                >
                    <div
                        className="flex items-center justify-between p-6 border-b border-[#3a3a3a]"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                    >
                        <h2 className="text-card-header">Edit Investment Transaction</h2>
                        <button
                            onClick={onClose}
                            disabled={isSaving || isDeleting}
                            className="p-2 rounded-full hover-text-purple transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Close"
                        >
                            <Xmark width={24} height={24} strokeWidth={1.5} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <form onSubmit={handleSubmit} className="p-6 pb-8 space-y-6">
                            {transaction.assetName && (
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#202020] flex items-center justify-center border border-[#3a3a3a]">
                                            <AssetLogo 
                                                src={transaction.icon || getDerivedAssetIcon(transaction.assetType, transaction.assetTicker, 'live')} 
                                                size={22} 
                                                className="text-[#AC66DA]" 
                                                fallback={getDerivedAssetIcon(transaction.assetType, transaction.assetTicker, 'manual')}
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">{transaction.assetName}</h3>
                                            <div className="flex items-center gap-2">
                                                {transaction.assetTicker && (
                                                    <span className="text-sm font-bold text-[#AC66DA] tracking-wider bg-[#AC66DA]/10 px-2 py-0.5 rounded uppercase">
                                                        {transaction.assetTicker}
                                                    </span>
                                                )}
                                                {transaction.assetType && (
                                                    <span className="text-xs text-helper capitalize">
                                                        • {transaction.assetType}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Row 1: Type Selection (Buy/Sell) */}
                            <div className="relative bg-[#202020] border border-[#3a3a3a] rounded-xl p-0.5 flex gap-0.5 h-[42px]">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, investmentType: 'buy' }))}
                                    disabled={isSaving || isDeleting}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer ${formData.investmentType === 'buy'
                                        ? 'bg-[#74C648] text-white shadow-sm'
                                        : 'bg-transparent text-[#8C8C8C] hover:text-[#E7E4E4]'
                                        }`}
                                >
                                    Buy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, investmentType: 'sell' }))}
                                    disabled={isSaving || isDeleting}
                                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer ${formData.investmentType === 'sell'
                                        ? 'bg-[#D93F3F] text-white shadow-sm'
                                        : 'bg-transparent text-[#8C8C8C] hover:text-[#E7E4E4]'
                                        }`}
                                >
                                    Sell
                                </button>
                            </div>

                            {/* Row 2: Quantity & Price */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-body font-medium mb-2">Quantity</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={quantityInput}
                                        onChange={(e) => {
                                            const sanitized = e.target.value.replace(/[^0-9.,]/g, '');
                                            setQuantityInput(sanitized);
                                        }}
                                        disabled={isSaving || isDeleting}
                                        className={`w-full px-4 py-2 rounded-xl bg-[#202020] text-body border transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                                            (() => {
                                                if (availableQuantity === null) return 'border-[#3a3a3a]';
                                                
                                                // Calculate if this change creates a negative balance
                                                const currentTotal = availableQuantity;
                                                const oldQty = transaction?.quantity || 0;
                                                const oldType = transaction?.investmentType;
                                                const newQty = parseFloat(quantityInput) || 0;
                                                const newType = formData.investmentType;
                                                
                                                let predictedTotal = currentTotal;
                                                // Reverse old
                                                if (oldType === 'buy') predictedTotal -= oldQty;
                                                else if (oldType === 'sell') predictedTotal += oldQty;
                                                // Apply new
                                                if (newType === 'buy') predictedTotal += newQty;
                                                else if (newType === 'sell') predictedTotal -= newQty;
                                                
                                                return predictedTotal < -0.00000001 ? 'border-[#D93F3F] focus:border-[#D93F3F]' : 'border-[#3a3a3a] focus:border-[#AC66DA]';
                                            })()
                                        }`}
                                        style={{ color: 'var(--text-primary)' }}
                                        placeholder="0.00"
                                    />
                                    <div className="mt-1.5 px-1 flex items-center justify-between">
                                        <div className="text-[10px] text-helper flex items-center gap-1">
                                            Current Portfolio: {isLoadingBalance ? '...' : (availableQuantity !== null ? formatSmartNumber(availableQuantity) : '0')} {formData.assetTicker}
                                        </div>
                                        {(() => {
                                            if (availableQuantity === null) return null;
                                            const currentTotal = availableQuantity;
                                            const oldQty = transaction?.quantity || 0;
                                            const oldType = transaction?.investmentType;
                                            const newQty = parseFloat(quantityInput) || 0;
                                            const newType = formData.investmentType;
                                            
                                            let predictedTotal = currentTotal;
                                            if (oldType === 'buy') predictedTotal -= oldQty;
                                            else if (oldType === 'sell') predictedTotal += oldQty;
                                            if (newType === 'buy') predictedTotal += newQty;
                                            else if (newType === 'sell') predictedTotal -= newQty;

                                            if (predictedTotal < -0.00000001) {
                                                return <div className="text-[10px] text-[#D93F3F] font-bold">Negative holding: {formatSmartNumber(predictedTotal)}</div>;
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-body font-medium mb-2">Price Per Share</label>
                                    <div className="relative">
                                        <span
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-body font-semibold"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {displaySymbol}
                                        </span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={priceInput}
                                            onChange={(e) => {
                                                const sanitized = e.target.value.replace(/[^0-9.,]/g, '');
                                                setPriceInput(sanitized);
                                            }}
                                            disabled={isSaving || isDeleting}
                                            className="w-full pl-8 pr-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors placeholder:text-[#8C8C8C] disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ color: 'var(--text-primary)' }}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Date & Currency */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-body font-medium mb-2">Date</label>
                                    <div className="relative" ref={dateDropdownRef}>
                                        <button
                                            type="button"
                                            ref={dateTriggerRef}
                                            onClick={() => setIsDateOpen(prev => !prev)}
                                            disabled={isSaving || isDeleting}
                                            className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            <span
                                                className="text-body font-semibold"
                                                style={{ color: dateInput ? 'var(--text-primary)' : '#8C8C8C' }}
                                            >
                                                {dateInput ? formatDateForDisplay(dateInput) : 'Select a date'}
                                            </span>
                                            <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
                                        </button>

                                        {isDateOpen && typeof document !== 'undefined' && createPortal(
                                            <div
                                                ref={datePortalRef}
                                                className="rounded-2xl shadow-lg border border-[#3a3a3a] overflow-hidden bg-[#202020]"
                                                style={{
                                                    ...(dateDropdownStyle ?? {
                                                        position: 'fixed',
                                                        top: -9999,
                                                        left: -9999,
                                                        zIndex: 1000,
                                                        minWidth: '320px',
                                                        width: 'max-content',
                                                    }),
                                                }}
                                            >
                                                <CalendarPanel
                                                    selectedDate={dateInput}
                                                    currentMonth={currentMonth}
                                                    onChange={handleDateSelect}
                                                    onMonthChange={setCurrentMonth}
                                                    controlAlignment="end"
                                                />
                                            </div>,
                                            document.body,
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-body font-medium mb-2">Currency</label>
                                    <CurrencySelector
                                        options={currencyOptions}
                                        selectedCurrencyId={selectedCurrencyId}
                                        onSelect={setSelectedCurrencyId}
                                        disabled={isSaving || isDeleting}
                                    />
                                </div>
                            </div>

                            {isDifferentCurrency && (
                                <div className="p-4 rounded-2xl bg-[#202020] border border-[#3a3a3a] min-h-[86px] flex flex-col justify-center">
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
                                    ) : (totalAmount > 0 && conversionRate !== null) ? (
                                        <>
                                            <div className="flex justify-between items-center text-sm mb-2">
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    Value at {formData.investmentType === 'buy' ? 'purchase' : 'sale'}
                                                </span>
                                                <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                                    {userCurrency.symbol}{formatSmartNumber(convertedTotal || 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                                                <span>Rate on {formatDateForDisplay(dateInput) || 'selected date'}</span>
                                                <span>
                                                    1 {selectedCurrency?.alias} = {new Intl.NumberFormat('en-US', {
                                                        maximumFractionDigits: (conversionRate || 0) < 1 ? 6 : 4,
                                                        minimumFractionDigits: 2
                                                    }).format(conversionRate || 0)} {userCurrency.alias}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
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
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-4">
                                {onDelete && (
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={isDeleting || isSaving}
                                        className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer hover:bg-[#B82E2E] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#D93F3F]"
                                        style={{ backgroundColor: '#D93F3F', color: 'var(--text-primary)' }}
                                    >
                                        <Trash width={16} height={16} strokeWidth={1.5} />
                                        <span>Delete</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSaving || isDeleting}
                                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#4a4a4a]"
                                    style={{
                                        backgroundColor: '#282828',
                                        color: 'var(--text-primary)',
                                        border: '1px solid #3a3a3a',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSaving && !isDeleting) {
                                            e.currentTarget.style.backgroundColor = '#323232';
                                            e.currentTarget.style.borderColor = '#4a4a4a';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSaving && !isDeleting) {
                                            e.currentTarget.style.backgroundColor = '#282828';
                                            e.currentTarget.style.borderColor = '#3a3a3a';
                                        }
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        isSaving || 
                                        isDeleting || 
                                        !quantityInput || 
                                        !priceInput || 
                                        (() => {
                                            if (availableQuantity === null) return false;
                                            const currentTotal = availableQuantity;
                                            const oldQty = transaction?.quantity || 0;
                                            const oldType = transaction?.investmentType;
                                            const newQty = parseFloat(quantityInput) || 0;
                                            const newType = formData.investmentType;
                                            
                                            let predictedTotal = currentTotal;
                                            if (oldType === 'buy') predictedTotal -= oldQty;
                                            else if (oldType === 'sell') predictedTotal += oldQty;
                                            if (newType === 'buy') predictedTotal += newQty;
                                            else if (newType === 'sell') predictedTotal -= newQty;
                                            
                                            return predictedTotal < -0.00000001;
                                        })()
                                    }
                                    className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
                                    onMouseEnter={(e) => {
                                        if (!isSaving && !isDeleting) {
                                            e.currentTarget.style.backgroundColor = '#9A4FB8';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSaving && !isDeleting) {
                                            e.currentTarget.style.backgroundColor = 'var(--accent-purple)';
                                        }
                                    }}
                                >
                                    {isSaving && <Spinner size={16} color="white" />}
                                    <FloppyDisk width={18} height={18} strokeWidth={1.5} />
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <ConfirmModal
                        isOpen={showDeleteConfirm}
                        title="Delete Transaction"
                        message={
                            <>
                                Are you sure you want to delete this <span className="font-bold text-[#E7E4E4]">{formData.investmentType === 'buy' ? 'purchase' : 'sale'}</span> transaction for <span className="font-bold text-[#E7E4E4]">{formData.quantity} {formData.assetTicker}</span>?
                                <br /><br />
                                This action cannot be undone.
                            </>
                        }
                        confirmLabel="Confirm"
                        cancelLabel="Cancel"
                        onConfirm={async () => {
                            setShowDeleteConfirm(false);
                            if (onDelete) {
                                await onDelete();
                                onClose();
                            }
                        }}
                        onCancel={() => setShowDeleteConfirm(false)}
                        isLoading={isDeleting}
                        variant="danger"
                    />
                </div>
            </div>
        </>
    );
}
