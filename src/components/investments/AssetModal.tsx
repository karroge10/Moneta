'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Xmark, Plus, Trash } from 'iconoir-react';
import useSWR, { mutate } from 'swr';
import Spinner from '@/components/ui/Spinner';
import InvestmentTransactionModal from './InvestmentTransactionModal';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import AssetLogo from './AssetLogo';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getAssetColor, getDerivedAssetIcon } from '@/lib/asset-utils';
import { formatSmartNumber } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';

import LineChart from '@/components/ui/LineChart';

interface AssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetId: string;
    onAddTransaction: (asset: any) => void;
    onSuccess?: () => void;
}

const fetcher = (url: string) => fetch(url).then(async (r) => {
    if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch');
    }
    return r.json();
});

export default function AssetModal({ isOpen, onClose, assetId, onAddTransaction, onSuccess }: AssetModalProps) {
    const { currency } = useCurrency();
    const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteAssetConfirm, setShowDeleteAssetConfirm] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<any | null>(null);
    const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
    const { addToast } = useToast();

    // New State for Renaming and Manual Pricing
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState('');
    const [isUpdatingValue, setIsUpdatingValue] = useState(false);
    const [newManualPrice, setNewManualPrice] = useState('');

    // Historical Chart State
    const [historyRange, setHistoryRange] = useState('1M');
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const { data, error, isLoading, isValidating, mutate: mutateAsset } = useSWR(
        isOpen && assetId ? `/api/investments/${assetId}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            refreshInterval: 0, // Explicitly disable any polling
        }
    );

    const asset = data?.asset;

    // Fetch Historical Data
    useEffect(() => {
        if (assetId && isOpen && asset?.pricingMode === 'live') {
            const fetchHistory = async () => {
                setIsHistoryLoading(true);
                try {
                    const res = await fetch(`/api/investments/${assetId}/history?range=${historyRange}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.history) {
                             setHistoryData(json.history.map((h: any) => ({ date: h.date, value: h.price })));
                        } else {
                            setHistoryData([]);
                        }
                    }
                } catch (e) {
                    console.error(e);
                    setHistoryData([]);
                } finally {
                    setIsHistoryLoading(false);
                }
            };
            fetchHistory();
        } else {
            // Reset if not live or closed
            if (!isHistoryLoading) setHistoryData([]);
        }
    }, [assetId, isOpen, historyRange, asset?.pricingMode]);

    // Sync local state with asset data when loaded
    useEffect(() => {
        if (asset) {
            setNewName(asset.name);
            setNewManualPrice(asset.manualPrice ? asset.manualPrice.toString() : (asset.currentPrice ? asset.currentPrice.toString() : ''));
        }
    }, [asset]);

    const handleUpdateAsset = async (updates: any) => {
        try {
            setIsSaving(true);
            const res = await fetch(`/api/investments/${assetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update asset');
            
            await mutateAsset();
            await mutate('/api/investments');
            setIsRenaming(false);
            setIsUpdatingValue(false);
            addToast('Asset updated successfully');
            if (onSuccess) onSuccess();
        } catch (e) {
            console.error(e);
            addToast('Failed to update asset', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Use backend calculated stats if available, fallback to frontend only if needed
    const assetStats = useMemo(() => {
        if (asset?.currentValue !== undefined) {
            return {
                totalInvested: asset.totalCost || 0,
                currentValue: asset.currentValue || 0,
                unrealizedPnL: asset.unrealizedPnl || 0,
                realizedPnL: asset.realizedPnl || 0,
                totalPnL: asset.pnl || 0,
                roi: asset.pnlPercent || 0,
                totalQuantity: asset.quantity || 0,
            };
        }

        // Fallback for cases where backend might not have calculated stats
        if (!asset?.transactions || asset.transactions.length === 0) {
            return { totalInvested: 0, currentValue: 0, unrealizedPnL: 0, roi: 0, totalQuantity: 0 };
        }

        let totalQuantity = 0;
        let totalInvested = 0;

        asset.transactions.forEach((tx: any) => {
            const qty = Number(tx.quantity);
            const price = Number(tx.pricePerUnit);
            if (tx.investmentType === 'buy') {
                totalQuantity += qty;
                totalInvested += qty * price;
            } else {
                totalQuantity -= qty;
                totalInvested -= qty * price;
            }
        });

        const currentPrice = asset.currentPrice ||
            (asset.transactions.length > 0 ? Number(asset.transactions[asset.transactions.length - 1].pricePerUnit) : 0);

        const currentValue = totalQuantity * currentPrice;
        const unrealizedPnL = currentValue - totalInvested;
        const roi = totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;

        return { totalInvested, currentValue, unrealizedPnL, roi, totalQuantity };
    }, [asset]);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleEditTransaction = (tx: any) => {
        setEditingTransaction({
            ...tx,
            assetName: asset?.name,
            assetTicker: asset?.ticker,
            icon: asset?.icon,
            assetType: asset?.assetType,
        });
    };

    const handleDeleteTransaction = async () => {
        if (!transactionToDelete) return;
        try {
            await fetch(`/api/transactions?id=${transactionToDelete.id}`, { method: 'DELETE' });
            await mutateAsset();
            await mutate('/api/investments');
            addToast('Transaction deleted');
            if (onSuccess) onSuccess();
            setTransactionToDelete(null);
        } catch (e) {
            console.error(e);
            addToast('Failed to delete transaction', 'error');
        }
    };

    const handleSaveTransaction = async (txData: any) => {
        try {
            setIsSaving(true);
            const res = await fetch('/api/transactions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(txData)
            });
            if (!res.ok) throw new Error('Failed to update');

            setEditingTransaction(null);
            await mutateAsset();
            await mutate('/api/investments');
            addToast('Transaction updated');
            if (onSuccess) onSuccess();
        } catch (e) {
            console.error(e);
            addToast('Failed to update transaction', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAsset = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/investments/${assetId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete asset');
            mutate('/api/investments');
            addToast('Asset deleted successfully');
            if (onSuccess) onSuccess();
            setShowDeleteAssetConfirm(false);
            onClose();
        } catch (e) {
            addToast('Failed to delete asset', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDirectTransactionDelete = async (txId: string) => {
        setIsDeletingTransaction(true);
        try {
            await fetch(`/api/transactions?id=${txId}`, { method: 'DELETE' });
            await mutateAsset();
            await mutate('/api/investments');
            addToast('Transaction deleted');
            if (onSuccess) onSuccess();
            setEditingTransaction(null);
        } catch (e) {
            console.error(e);
            addToast('Failed to delete transaction', 'error');
        } finally {
            setIsDeletingTransaction(false);
        }
    };

    const currencySymbol = currency.symbol;

    return createPortal(
        <>
            <div
                className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
                onClick={onClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200 pointer-events-none">
                <div
                    className="w-full max-w-4xl max-h-[94vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between p-6 border-b border-[#3a3a3a]"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                    >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            {isLoading && !asset ? (
                                <>
                                    {/* Skeleton for icon */}
                                    <div className="w-12 h-12 rounded-full animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                                    <div className="flex-1 min-w-0">
                                        {/* Skeleton for title */}
                                        <div className="h-6 w-48 rounded animate-pulse mb-2" style={{ backgroundColor: '#3a3a3a' }}></div>
                                        {/* Skeleton for ticker/type */}
                                        <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                                    </div>
                                </>
                            ) : asset ? (
                                <>
                                    <div className="w-12 h-12 icon-circle bg-[#202020]">
                                        <AssetLogo
                                            src={asset.icon || getDerivedAssetIcon(asset.assetType, asset.ticker, asset.pricingMode)}
                                            size={28}
                                            style={{ color: getAssetColor(asset.assetType) }}
                                            fallback={getDerivedAssetIcon(asset.assetType, asset.ticker, 'manual')}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        {/* Row 1: Name & Price */}
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                {isRenaming ? (
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            value={newName}
                                                            onChange={(e) => setNewName(e.target.value)}
                                                            disabled={isSaving}
                                                            className="text-card-header bg-[#202020] border border-[#3a3a3a] rounded px-2 py-0.5 focus:border-[#AC66DA] focus:outline-none min-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleUpdateAsset({ name: newName });
                                                                if (e.key === 'Escape') setIsRenaming(false);
                                                            }}
                                                        />
                                                        <button 
                                                            onClick={() => handleUpdateAsset({ name: newName })}
                                                            disabled={isSaving}
                                                            className="text-xs bg-[#AC66DA] text-white px-2 py-1 rounded hover:bg-[#9A4FB8] disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Save
                                                        </button>
                                                        <button 
                                                            onClick={() => setIsRenaming(false)}
                                                            disabled={isSaving}
                                                            className="text-xs bg-[#3a3a3a] text-white px-2 py-1 rounded hover:bg-[#4a4a4a] disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 group min-w-0">
                                                        <h2 className="text-card-header truncate max-w-[300px] leading-tight">{asset.name}</h2>
                                                        {asset.userId && (
                                                            <button 
                                                                onClick={() => setIsRenaming(true)}
                                                                className="opacity-0 group-hover:opacity-100 text-[#AC66DA] hover:text-[#9A4FB8] transition-opacity shrink-0"
                                                                title="Rename Asset"
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor"><path d="M14.363 5.652l1.48-1.48a2 2 0 012.829 0l1.414 1.414a2 2 0 010 2.828l-1.48 1.48m-4.243-4.242l-9.616 9.615a2 2 0 00-.578 1.238l-.242 2.74a1 1 0 001.084 1.085l2.74-.242a2 2 0 001.24-.578l9.615-9.616m-4.243-4.242l4.242 4.242" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {asset.pricingMode === 'live' && asset.currentPrice && (
                                                <div className="text-right shrink-0">
                                                    <div className="text-base font-bold text-[#E7E4E4] leading-tight">
                                                        {currencySymbol}{formatSmartNumber(asset.currentPrice)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Row 2: Details & Ticker Label */}
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-2">
                                                <span 
                                                    className="text-sm font-bold tracking-wider bg-current/10 px-2 py-0.5 rounded uppercase leading-none"
                                                    style={{ color: getAssetColor(asset.assetType) }}
                                                >
                                                    {assetStats.totalQuantity ? formatSmartNumber(assetStats.totalQuantity) : '0'} {asset.ticker || (assetStats.totalQuantity === 1 ? 'Item' : 'Items')}
                                                </span>
                                                {asset.assetType && <span className="text-xs font-medium text-helper capitalize">• {asset.assetType}</span>}
                                            </div>

                                            {asset.pricingMode === 'live' && asset.currentPrice && (
                                                <div className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#202020] border border-[#3a3a3a] text-secondary leading-none shrink-0">
                                                    Per 1 {asset.ticker}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover-text-purple transition-colors cursor-pointer flex-shrink-0"
                            aria-label="Close"
                        >
                            <Xmark width={24} height={24} strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {error || (!asset && !isLoading) ? (
                            <div className="text-center py-10 px-6">
                                <p className="text-[#D93F3F] mb-4">{error?.message || 'Asset not found'}</p>
                                <button onClick={() => mutateAsset()} className="px-4 py-2 bg-[#AC66DA] rounded-xl text-white font-bold text-sm hover:bg-[#9A4FB8] transition-colors">Retry</button>
                            </div>
                        ) : (
                            <div className="p-6 pb-8 space-y-6">
                                {/* Asset Info Overview */}
                                <div>
                                    <h3 className="text-body font-medium mb-3">Overview</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Total Invested', value: assetStats.totalInvested, isPnL: false },
                                            { label: 'Current Value', value: assetStats.currentValue, isPnL: false, isCurrentValue: true },
                                            { label: 'P&L', value: assetStats.totalPnL, isPnL: true },
                                            { label: 'ROI', value: assetStats.roi, isPnL: true, isPercent: true },
                                        ].map((stat, i) => (
                                            <div key={i} className="p-4 bg-[#202020] rounded-2xl border border-[#3a3a3a] relative group">
                                                <div className="text-xs text-helper uppercase tracking-wider mb-1">{stat.label}</div>
                                                
                                                {/* ... (rest of card contents adjusted) */}
                                                {(isLoading || isValidating) ? (
                                                    <div className="h-6 w-24 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                                                ) : stat.isCurrentValue && isUpdatingValue && asset?.userId ? (
                                                    /* ... form remains same ... */
                                                    <div className="space-y-2">
                                                        <input 
                                                            type="number"
                                                            value={newManualPrice}
                                                            onChange={(e) => setNewManualPrice(e.target.value)}
                                                            disabled={isSaving}
                                                            className="w-full text-sm bg-[#282828] border border-[#3a3a3a] rounded px-2 py-1 focus:border-[#AC66DA] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                                            placeholder="Enter price"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleUpdateAsset({ manualPrice: newManualPrice });
                                                                if (e.key === 'Escape') setIsUpdatingValue(false);
                                                            }}
                                                        />
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={() => handleUpdateAsset({ manualPrice: newManualPrice })}
                                                                disabled={isSaving}
                                                                className="flex-1 text-xs bg-[#AC66DA] text-white px-2 py-1 rounded hover:bg-[#9A4FB8] disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Save
                                                            </button>
                                                            <button 
                                                                onClick={() => setIsUpdatingValue(false)}
                                                                disabled={isSaving}
                                                                className="flex-1 text-xs bg-[#3a3a3a] text-white px-2 py-1 rounded hover:bg-[#4a4a4a] disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`text-lg font-bold ${stat.isPnL ? (stat.value >= 0 ? 'text-[#74C648]' : 'text-[#D93F3F]') : ''}`}>
                                                        {stat.isPnL ? (stat.value >= 0 ? '+' : '') : ''}
                                                        {stat.isPercent ? '' : stat.isQuantity ? '' : currencySymbol}
                                                        {stat.isPercent ? stat.value.toFixed(2) : stat.isQuantity ? formatSmartNumber(stat.value) : formatSmartNumber(Math.abs(stat.value))}
                                                        {stat.isPercent ? '%' : ''}
                                                    </div>
                                                )}
                                                
                                                {/* Edit Icon for Manual Assets on Current Value Card */}
                                                {stat.isCurrentValue && asset?.userId && asset?.pricingMode === 'manual' && !isUpdatingValue && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsUpdatingValue(true);
                                                        }}
                                                        className="absolute top-2 right-2 transition-opacity p-1.5 rounded-full hover:bg-[#282828]"
                                                        title="Edit Value"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" fill="none" xmlns="http://www.w3.org/2000/svg" color="#AC66DA">
                                                            <path d="M14.363 5.652l1.48-1.48a2 2 0 012.829 0l1.414 1.414a2 2 0 010 2.828l-1.48 1.48m-4.243-4.242l-9.616 9.615a2 2 0 00-.578 1.238l-.242 2.74a1 1 0 001.084 1.085l2.74-.242a2 2 0 001.24-.578l9.615-9.616m-4.243-4.242l4.242 4.242" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"></path>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Historical Performance Chart */}
                                {asset?.pricingMode === 'live' && (
                                    <div className="bg-[#202020] rounded-3xl border border-[#3a3a3a] p-6 relative overflow-hidden">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-body font-medium">Price History</h3>
                                            <div className="flex bg-[#282828] rounded-lg p-1 border border-[#3a3a3a]">
                                                {['1W', '1M', '3M', '1Y', 'All'].map((range) => (
                                                    <button
                                                        key={range}
                                                        onClick={() => setHistoryRange(range)}
                                                        disabled={isHistoryLoading}
                                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                                                            historyRange === range
                                                            ? 'bg-[#AC66DA] text-white' 
                                                            : 'text-secondary hover:text-white'
                                                        } ${isHistoryLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {range}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="h-[300px] w-full -ml-4 relative">
                                            {isHistoryLoading && (
                                                <div className="absolute inset-0 z-10 bg-[#202020]/50 flex items-center justify-center backdrop-blur-sm">
                                                    <Spinner size={24} />
                                                </div>
                                            )}
                                            
                                            {historyData && historyData.length > 0 ? (
                                                <LineChart 
                                                    data={historyData} 
                                                    currencySymbol={currencySymbol} 
                                                />
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-helper">
                                                    {!isHistoryLoading && 'No price history available'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}


                                {/* Transactions */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-body font-medium">Transactions</h3>
                                    </div>

                                    {(isLoading || isValidating) ? (
                                        <div className="rounded-3xl border border-[#3a3a3a] overflow-hidden" style={{ backgroundColor: '#202020' }}>
                                            <table className="min-w-full">
                                                <thead className="sticky top-0 z-10 bg-[#202020]">
                                                    <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                                                        <th className="px-5 py-3 align-top bg-[#202020]">Date</th>
                                                        <th className="px-5 py-3 align-top bg-[#202020]">Type</th>
                                                        <th className="px-5 py-3 align-top text-right bg-[#202020]">Quantity</th>
                                                        <th className="px-5 py-3 align-top text-right bg-[#202020]">Price</th>
                                                        <th className="px-5 py-3 align-top text-right bg-[#202020]">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Array.from({ length: 3 }).map((_, i) => (
                                                        <tr key={i} className="border-t border-[#2A2A2A]">
                                                            <td className="px-5 py-4 align-top">
                                                                <div className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                                                            </td>
                                                            <td className="px-5 py-4 align-top">
                                                                <div className="h-4 w-12 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                                                            </td>
                                                            <td className="px-5 py-4 align-top text-right">
                                                                <div className="h-4 w-16 rounded animate-pulse ml-auto" style={{ backgroundColor: '#3a3a3a' }}></div>
                                                            </td>
                                                            <td className="px-5 py-4 align-top text-right">
                                                                <div className="h-4 w-20 rounded animate-pulse ml-auto" style={{ backgroundColor: '#3a3a3a' }}></div>
                                                            </td>
                                                            <td className="px-5 py-4 align-top text-right">
                                                                <div className="h-4 w-24 rounded animate-pulse ml-auto" style={{ backgroundColor: '#3a3a3a' }}></div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="rounded-3xl border border-[#3a3a3a] overflow-hidden relative" style={{ backgroundColor: '#202020' }}>
                                            {(isSaving || isDeleting) && (
                                                <div className="absolute inset-0 z-10 bg-black/5 backdrop-blur-[1px] flex items-center justify-center transition-all duration-300">
                                                    <div className="bg-[#282828] p-3 rounded-2xl shadow-xl border border-[#3a3a3a] flex items-center justify-center">
                                                        <Spinner size={16} />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="overflow-x-auto max-h-[40vh]">
                                                <table className="min-w-full">
                                                    <thead className="sticky top-0 z-10 bg-[#202020]">
                                                        <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                                                            <th className="px-5 py-3 align-top bg-[#202020]">Date</th>
                                                            <th className="px-5 py-3 align-top bg-[#202020]">Type</th>
                                                            <th className="px-5 py-3 align-top text-right bg-[#202020]">Quantity</th>
                                                            <th className="px-5 py-3 align-top text-right bg-[#202020]">Price</th>
                                                            <th className="px-5 py-3 align-top text-right bg-[#202020]">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {asset?.transactions?.map((tx: any) => {
                                                            const isBuy = tx.investmentType === 'buy';
                                                            const total = Number(tx.quantity) * Number(tx.pricePerUnit);
                                                            return (
                                                                <tr
                                                                    key={tx.id}
                                                                    className="border-t border-[#2A2A2A] group cursor-pointer hover:opacity-80 transition-opacity relative"
                                                                    onClick={() => handleEditTransaction(tx)}
                                                                >
                                                                    <td className="px-5 py-4 align-top">
                                                                        <span className="text-sm">{formatDateForDisplay(tx.date)}</span>
                                                                    </td>
                                                                    <td className="px-5 py-4 align-top">
                                                                        <span className={`text-sm font-semibold ${isBuy ? 'text-[#74C648]' : 'text-[#D93F3F]'}`}>
                                                                            {isBuy ? 'Buy' : 'Sell'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-5 py-4 align-top text-right">
                                                                        <span className="text-sm">{Number(tx.quantity).toLocaleString(undefined, { maximumFractionDigits: 8 })}</span>
                                                                    </td>
                                                                    <td className="px-5 py-4 align-top text-right">
                                                                        <span className="text-sm">{tx.currency?.symbol || currencySymbol}{formatSmartNumber(Number(tx.pricePerUnit))}</span>
                                                                    </td>
                                                                    <td className="px-5 py-4 align-top text-right">
                                                                        <span className="text-sm font-semibold">{tx.currency?.symbol || currencySymbol}{formatSmartNumber(total)}</span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4">
                                    <button
                                        onClick={() => setShowDeleteAssetConfirm(true)}
                                        disabled={isDeleting}
                                        className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer hover:bg-[#B82E2E] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#D93F3F]"
                                        style={{ backgroundColor: '#D93F3F', color: 'var(--text-primary)' }}
                                    >
                                        <Trash width={16} height={16} strokeWidth={1.5} />
                                        <span>Delete</span>
                                    </button>
                                    <button
                                        onClick={onClose}
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
                                        Close
                                    </button>
                                    <button
                                        onClick={() => onAddTransaction(asset)}
                                        className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#9A4FB8';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--accent-purple)';
                                        }}
                                    >
                                        <Plus width={18} height={18} strokeWidth={2.5} />
                                        <span>Add Transaction</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}

                </div>
            </div >

            {/* Edit Transaction Modal */}
            {editingTransaction && (
                <InvestmentTransactionModal
                    transaction={editingTransaction}
                    onClose={() => setEditingTransaction(null)}
                    onSave={handleSaveTransaction}
                    onDelete={() => handleDirectTransactionDelete(editingTransaction.id)}
                    isSaving={isSaving}
                    isDeleting={isDeletingTransaction}
                    currencySymbol={currencySymbol}
                />
            )}

            <ConfirmModal
                isOpen={showDeleteAssetConfirm}
                title="Delete Asset"
                message={`Are you sure you want to remove ${asset?.name}? This will permanently delete the asset and ALL its associated transactions from your portfolio. This action cannot be undone.`}
                confirmLabel="Confirm"
                cancelLabel="Cancel"
                onConfirm={handleDeleteAsset}
                onCancel={() => setShowDeleteAssetConfirm(false)}
                isLoading={isDeleting}
                variant="danger"
            />

            <ConfirmModal
                isOpen={!!transactionToDelete}
                title="Delete Transaction"
                message="Are you sure you want to delete this transaction? This action cannot be undone."
                confirmLabel="Confirm"
                cancelLabel="Cancel"
                onConfirm={handleDeleteTransaction}
                onCancel={() => setTransactionToDelete(null)}
                variant="danger"
            />
        </>,
        document.body
    );
}
