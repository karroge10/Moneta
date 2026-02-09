'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Xmark, Plus, Trash } from 'iconoir-react';
import useSWR, { mutate } from 'swr';
import TransactionList from './TransactionList';
import Spinner from '@/components/ui/Spinner';
import TransactionForm from './TransactionForm';
import { useCurrency } from '@/hooks/useCurrency';

interface AssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetId: string;
    onAddTransaction: (asset: any) => void; // Callback to open Add Modal (full wizard)
}

const fetcher = (url: string) => fetch(url).then(async (r) => {
    if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch');
    }
    return r.json();
});

export default function AssetModal({ isOpen, onClose, assetId, onAddTransaction }: AssetModalProps) {
    const { currency } = useCurrency();
    const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data, error, isLoading, mutate: mutateAsset } = useSWR(
        isOpen && assetId ? `/api/investments/${assetId}` : null,
        fetcher
    );

    const asset = data?.asset;

    // Handle outside click
    useEffect(() => {
        const docClick = (e: MouseEvent) => {
            // Logic handled by overlay usually
        };
    }, []);

    if (!isOpen) return null;

    const handleEditTransaction = (tx: any) => {
        setEditingTransaction(tx);
        setIsEditFormOpen(true);
    };

    const handleDeleteTransaction = async (tx: any) => {
        if (!confirm('Are you sure you want to delete this transaction?')) return;
        try {
            await fetch(`/api/transactions?id=${tx.id}`, { method: 'DELETE' });
            mutateAsset();
            mutate('/api/investments'); // global refresh
        } catch (e) {
            console.error(e);
            alert('Failed to delete transaction');
        }
    };

    const handleSaveTransaction = async (txData: any) => {
        try {
            // Only supports update here
            const res = await fetch('/api/transactions', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(txData)
            });
            if (!res.ok) throw new Error('Failed to update');

            setIsEditFormOpen(false);
            setEditingTransaction(null);
            mutateAsset();
            mutate('/api/investments');
        } catch (e) {
            console.error(e);
            alert('Failed to update transaction');
        }
    };

    const handleDeleteAsset = async () => {
        if (!confirm('Are you sure you want to remove this asset and all its transactions?')) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/investments/${assetId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            mutate('/api/investments');
            onClose();
        } catch (e) {
            alert('Failed to delete asset');
        } finally {
            setIsDeleting(false);
        }
    };

    const currencySymbol = currency.symbol;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#282828] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#3a3a3a] bg-[#282828]">
                    <div className="flex items-center gap-4">
                        {asset && (
                            <div className="w-12 h-12 rounded-full bg-[#202020] flex items-center justify-center border border-[#3a3a3a]">
                                {/* Placeholder for Icon */}
                                <span className="text-xl font-bold text-[#AC66DA]">{asset.ticker?.[0] || 'A'}</span>
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-[#E7E4E4]">{asset?.name || 'Asset Details'}</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-[#AC66DA] tracking-wider bg-[#AC66DA]/10 px-2 py-0.5 rounded uppercase">{asset?.ticker}</span>
                                {asset?.assetType && <span className="text-xs text-helper capitalize">• {asset.assetType}</span>}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#3a3a3a] text-helper hover:text-white transition-colors"
                    >
                        <Xmark width={24} height={24} strokeWidth={2} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar bg-[#202020]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20"><Spinner /></div>
                    ) : error || !asset ? (
                        <div className="text-center py-10">
                            <p className="text-[#D93F3F] mb-4">{error?.message || 'Asset not found'}</p>
                            <button onClick={() => mutateAsset()} className="px-4 py-2 bg-[#AC66DA] rounded-lg text-white font-bold text-sm">Retry</button>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Simplified stats - aggregate can be computed here or fetched. 
                        Currently backend GET /api/investments/[id] returns asset + transactions.
                        It does NOT return aggregate PnL (that's in portfolio summary).
                        We can sum transactions here OR just show simple list. 
                        For MVP, list is enough. */}
                            </div>

                            {/* Transactions */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold">Transactions</h3>
                                    <button
                                        onClick={() => onAddTransaction(asset)} // Pass asset to parent to open Add Form
                                        className="flex items-center gap-2 px-4 py-2 bg-[#AC66DA] hover:bg-[#9A4FB8] text-white rounded-xl text-sm font-bold transition-colors"
                                    >
                                        <Plus width={18} height={18} strokeWidth={2} /> Add Transaction
                                    </button>
                                </div>

                                <TransactionList
                                    transactions={asset?.transactions || []}
                                    onEdit={handleEditTransaction}
                                    onDelete={handleDeleteTransaction}
                                    currencySymbol={currencySymbol}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#3a3a3a] bg-[#282828] flex justify-between items-center">
                    <button
                        onClick={handleDeleteAsset}
                        disabled={isDeleting}
                        className="flex items-center gap-2 text-[#D93F3F] hover:text-[#ff5555] text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <Trash width={18} height={18} /> Remove Asset from Portfolio
                    </button>
                    <button onClick={onClose} className="px-6 py-2 rounded-xl border border-[#3a3a3a] hover:bg-[#3a3a3a] text-sm font-medium">
                        Close
                    </button>
                </div>

                {/* Edit Transaction Modal Overlay */}
                {isEditFormOpen && (
                    <div className="absolute inset-0 z-50 bg-[#282828]">
                        <div className="h-full flex flex-col">
                            <div className="flex justify-between items-center p-6 border-b border-[#3a3a3a]">
                                <h3 className="text-xl font-bold">Edit Transaction</h3>
                                <button onClick={() => setIsEditFormOpen(false)}><Xmark /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <TransactionForm
                                    transaction={editingTransaction}
                                    assetTicker={asset?.ticker}
                                    assetName={asset?.name}
                                    onSave={handleSaveTransaction}
                                    onCancel={() => setIsEditFormOpen(false)}
                                    isSaving={false}
                                    currencySymbol={currencySymbol}
                                />
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>,
        document.body
    );
}
