'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Xmark, Plus, Trash } from 'iconoir-react';
import useSWR, { mutate } from 'swr';
import Spinner from '@/components/ui/Spinner';
import InvestmentTransactionModal from './InvestmentTransactionModal';
import { useCurrency } from '@/hooks/useCurrency';
import { formatDateForDisplay } from '@/lib/dateFormatting';
import { getIcon } from '@/lib/iconMapping';
import AssetLogo from './AssetLogo';
import ConfirmModal from '@/components/ui/ConfirmModal';

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

    // Use backend calculated stats if available, fallback to frontend only if needed
    const assetStats = useMemo(() => {
        if (asset?.currentValue !== undefined) {
            return {
                totalInvested: asset.totalCost || 0,
                currentValue: asset.currentValue || 0,
                unrealizedPnL: asset.pnl || 0,
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
            if (onSuccess) onSuccess();
            setTransactionToDelete(null);
        } catch (e) {
            console.error(e);
            alert('Failed to delete transaction');
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
            if (onSuccess) onSuccess();
        } catch (e) {
            console.error(e);
            alert('Failed to update transaction');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAsset = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/investments/${assetId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            mutate('/api/investments');
            if (onSuccess) onSuccess();
            setShowDeleteAssetConfirm(false);
            onClose();
        } catch (e) {
            alert('Failed to delete asset');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDirectTransactionDelete = async (txId: string) => {
        try {
            await fetch(`/api/transactions?id=${txId}`, { method: 'DELETE' });
            await mutateAsset();
            await mutate('/api/investments');
            if (onSuccess) onSuccess();
            setEditingTransaction(null);
        } catch (e) {
            console.error(e);
            alert('Failed to delete transaction');
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
                                    <div className="w-12 h-12 rounded-full bg-[#202020] flex items-center justify-center border border-[#3a3a3a]">
                                        <AssetLogo
                                            src={asset.icon || (
                                                asset.assetType === 'crypto' ? 'BitcoinCircle' :
                                                    asset.assetType === 'stock' ? 'Cash' :
                                                        asset.assetType === 'property' ? 'Neighbourhood' :
                                                            'ViewGrid'
                                            )}
                                            size={28}
                                            className="text-[#AC66DA]"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-card-header truncate">{asset.name}</h2>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-[#AC66DA] tracking-wider bg-[#AC66DA]/10 px-2 py-0.5 rounded uppercase">{asset.ticker}</span>
                                            {asset.assetType && <span className="text-xs text-helper capitalize">• {asset.assetType}</span>}
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
                                            { label: 'Current Value', value: assetStats.currentValue, isPnL: false },
                                            { label: 'P&L', value: assetStats.unrealizedPnL, isPnL: true },
                                            { label: 'ROI', value: assetStats.roi, isPnL: true, isPercent: true },
                                        ].map((stat, i) => (
                                            <div key={i} className="p-4 bg-[#202020] rounded-2xl border border-[#3a3a3a]">
                                                <div className="text-xs text-helper uppercase tracking-wider mb-1">{stat.label}</div>
                                                {(isLoading || isValidating) ? (
                                                    <div className="h-6 w-24 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                                                ) : (
                                                    <div className={`text-lg font-bold ${stat.isPnL ? (stat.value >= 0 ? 'text-[#74C648]' : 'text-[#D93F3F]') : ''}`}>
                                                        {stat.isPnL ? (stat.value >= 0 ? '+' : '') : ''}
                                                        {stat.isPercent ? '' : currencySymbol}
                                                        {Math.abs(stat.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        {stat.isPercent ? '%' : ''}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

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
                                                    <div className="bg-[#282828] p-3 rounded-2xl shadow-xl border border-[#3a3a3a] flex items-center gap-2">
                                                        <Spinner size={16} />
                                                        <span className="text-xs font-medium text-helper uppercase tracking-wider">Processing...</span>
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
                                                                        <span className="text-sm">{Number(tx.quantity).toLocaleString()}</span>
                                                                    </td>
                                                                    <td className="px-5 py-4 align-top text-right">
                                                                        <span className="text-sm">{tx.currency?.symbol || currencySymbol}{Number(tx.pricePerUnit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                                    </td>
                                                                    <td className="px-5 py-4 align-top text-right flex items-center justify-end gap-3">
                                                                        <span className="text-sm font-semibold">{tx.currency?.symbol || currencySymbol}{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setTransactionToDelete(tx);
                                                                            }}
                                                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-[#D93F3F]/10 text-[#D93F3F] hover:bg-[#D93F3F]/20 transition-all"
                                                                        >
                                                                            <Trash width={16} height={16} strokeWidth={1.5} />
                                                                        </button>
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
                                        <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
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
                    currencySymbol={currencySymbol}
                />
            )}

            <ConfirmModal
                isOpen={showDeleteAssetConfirm}
                title="Delete Asset"
                message={`Are you sure you want to remove ${asset?.name}? This will permanently delete the asset and ALL its associated transactions from your portfolio. This action cannot be undone.`}
                confirmLabel="Delete Asset"
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
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={handleDeleteTransaction}
                onCancel={() => setTransactionToDelete(null)}
                variant="danger"
            />
        </>,
        document.body
    );
}
