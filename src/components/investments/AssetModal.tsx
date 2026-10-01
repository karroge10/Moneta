'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash } from 'iconoir-react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ErrorState from '@/components/ui/ErrorState';
import Skeleton from '@/components/ui/Skeleton';
import InvestmentTransactionModal from './InvestmentTransactionModal';
import AssetHeader from './asset/AssetHeader';
import AssetOverview from './asset/AssetOverview';
import AssetPriceHistory from './asset/AssetPriceHistory';
import AssetTransactionsTable from './asset/AssetTransactionsTable';
import { useCurrency } from '@/hooks/useCurrency';
import { useAssetDetail } from '@/hooks/investments/useInvestmentQueries';
import {
  useDeleteAsset,
  useDeleteInvestmentTransaction,
  useUpdateAsset,
  useUpdateInvestmentTransaction,
} from '@/hooks/investments/useInvestmentMutations';
import type { AssetDetail, Holding } from '@/hooks/investments/types';
import { useToast } from '@/contexts/ToastContext';
import { isApiError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  AssetDetailTransactionRow,
  AssetUpdatePayload,
  InvestmentForAddTransaction,
  InvestmentTransactionEditState,
} from '@/types/investments';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  onAddTransaction: (asset: InvestmentForAddTransaction) => void;
}

/** Asset details: stats, price history, transactions, rename, manual price, delete. */
export default function AssetModal({ isOpen, onClose, assetId, onAddTransaction }: AssetModalProps) {
  const { currency } = useCurrency();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [editingTransaction, setEditingTransaction] = useState<InvestmentTransactionEditState | null>(null);
  const [showDeleteAssetConfirm, setShowDeleteAssetConfirm] = useState(false);

  const detail = useAssetDetail(isOpen ? assetId : '');
  const updateAsset = useUpdateAsset(assetId);
  const deleteAsset = useDeleteAsset(assetId);
  const updateTransaction = useUpdateInvestmentTransaction();
  const deleteTransaction = useDeleteInvestmentTransaction();

  const asset = detail.data;
  const loading = detail.isPending;
  const busy = updateAsset.isPending || deleteAsset.isPending || deleteTransaction.isPending || updateTransaction.isPending;
  const currencySymbol = currency.symbol;

  const handleUpdateAsset = async (updates: AssetUpdatePayload): Promise<boolean> => {
    try {
      await updateAsset.mutateAsync(updates);
      addToast('Asset updated successfully');
      return true;
    } catch {
      addToast('Failed to update asset', 'error');
      return false;
    }
  };

  const handleDeleteAsset = async () => {
    try {
      await deleteAsset.mutateAsync();
      addToast('Asset deleted successfully');
      setShowDeleteAssetConfirm(false);
      onClose();
    } catch {
      addToast('Failed to delete asset', 'error');
    }
  };

  const handleSaveTransaction = async (transaction: InvestmentTransactionEditState) => {
    try {
      await updateTransaction.mutateAsync(transaction);
      setEditingTransaction(null);
      addToast('Transaction updated');
    } catch {
      addToast('Failed to update transaction', 'error');
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteTransaction.mutateAsync(transactionId);
      addToast('Transaction deleted');
      setEditingTransaction(null);
      const detailError = queryClient.getQueryState(queryKeys.investments.detail(assetId))?.error;
      if (isApiError(detailError, 404)) onClose();
    } catch {
      addToast('Failed to delete transaction', 'error');
    }
  };

  const openTransaction = (row: AssetDetailTransactionRow) => {
    setEditingTransaction({
      ...row,
      quantity: Number(row.quantity),
      pricePerUnit: Number(row.pricePerUnit),
      assetName: asset?.name,
      assetTicker: asset?.ticker,
      icon: asset?.icon,
      assetType: asset?.assetType,
    });
  };

  const footer = asset ? (
    <>
      <Button
        variant="danger"
        onClick={() => setShowDeleteAssetConfirm(true)}
        disabled={busy || loading}
        icon={<Trash width={16} height={16} strokeWidth={1.5} aria-hidden="true" />}
        className="sm:mr-auto"
      >
        Delete
      </Button>
      <Button variant="secondary" onClick={onClose} disabled={busy}>
        Close
      </Button>
      <Button
        onClick={() => onAddTransaction(toAddTransactionAsset(asset))}
        disabled={busy || loading}
        icon={<Plus width={18} height={18} strokeWidth={2.5} aria-hidden="true" />}
      >
        Add Transaction
      </Button>
    </>
  ) : undefined;

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} title={asset?.name ?? 'Asset'} size="xl" dismissible={!busy} footer={footer}>
        {loading ? (
          <AssetModalSkeleton />
        ) : !asset ? (
          <ErrorState
            title="Could not load this asset"
            message={detail.error?.message || 'Asset not found'}
            onRetry={() => detail.refetch()}
            retrying={detail.isFetching}
          />
        ) : (
          <div className="space-y-6 pb-2">
            <AssetHeader
              key={asset.name}
              asset={asset}
              currencySymbol={currencySymbol}
              onRename={(name) => handleUpdateAsset({ name })}
              saving={updateAsset.isPending}
              disabled={busy}
            />
            <AssetOverview
              asset={asset}
              currencySymbol={currencySymbol}
              onUpdatePrice={(manualPrice) => handleUpdateAsset({ manualPrice })}
              saving={updateAsset.isPending}
              disabled={busy}
            />
            {asset.pricingMode === 'live' && (
              <AssetPriceHistory assetId={assetId} currencySymbol={currencySymbol} disabled={busy} />
            )}
            <AssetTransactionsTable
              transactions={asset.transactions ?? []}
              currencySymbol={currencySymbol}
              busy={busy}
              onSelect={openTransaction}
            />
          </div>
        )}
      </Dialog>

      {editingTransaction && asset && (
        <InvestmentTransactionModal
          key={editingTransaction.id}
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleSaveTransaction}
          onDelete={() => handleDeleteTransaction(editingTransaction.id)}
          isSaving={updateTransaction.isPending}
          isDeleting={deleteTransaction.isPending}
          currencySymbol={currencySymbol}
          portfolio={[toHolding(asset)]}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteAssetConfirm}
        title="Delete Asset"
        message={
          <>
            Are you sure you want to remove <span className="font-bold text-fg">{asset?.name || 'this asset'}</span>?
            <br />
            <br />
            This will permanently delete the asset and <span className="font-bold text-negative-fg">ALL</span> its associated
            transactions from your portfolio. This action cannot be undone.
          </>
        }
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={handleDeleteAsset}
        onCancel={() => setShowDeleteAssetConfirm(false)}
        isLoading={deleteAsset.isPending}
        variant="danger"
      />
    </>
  );
}

function AssetModalSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {SKELETON_TILES.map((tile) => (
          <Skeleton key={tile} className="h-20 rounded-panel" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-card" />
    </div>
  );
}

const SKELETON_TILES = [0, 1, 2, 3];

function toAddTransactionAsset(asset: AssetDetail): InvestmentForAddTransaction {
  return {
    id: String(asset.id),
    name: asset.name,
    ticker: asset.ticker,
    assetType: asset.assetType,
    icon: asset.icon ?? '',
  };
}

/** The edit dialog checks holdings by ticker or name; the open asset is the only one that matters here. */
function toHolding(asset: AssetDetail): Holding {
  return {
    id: String(asset.id),
    name: asset.name,
    subtitle: asset.ticker ?? '',
    ticker: asset.ticker,
    assetType: asset.assetType,
    quantity: asset.quantity,
    currentValue: asset.currentValue ?? 0,
    changePercent: asset.pnlPercent ?? 0,
    icon: asset.icon ?? '',
  };
}
