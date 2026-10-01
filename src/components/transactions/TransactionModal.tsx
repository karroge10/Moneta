'use client';

import { useId, useState } from 'react';
import { FloppyDisk, Pause, Play, Trash } from 'iconoir-react';
import type { Transaction, Category } from '@/types/dashboard';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Spinner from '@/components/ui/Spinner';
import { useCurrency } from '@/hooks/useCurrency';
import { useTransactionForm, type CurrencyOptionLite } from '@/hooks/transactions/useTransactionForm';
import TransactionForm from './TransactionForm';

interface TransactionModalProps {
  transaction: Transaction | null;
  mode?: 'add' | 'edit';
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  onDelete?: () => void;
  onPauseResume?: (recurringId: number, isActive: boolean) => void;
  isSaving?: boolean;
  isDeleting?: boolean;
  categories: Category[];
  currencyOptions: CurrencyOptionLite[];
  currencyOptionsLoading?: boolean;
}

/** Add / edit transaction dialog. Keyed by transaction id so the form starts fresh per transaction. */
export default function TransactionModal(props: TransactionModalProps) {
  if (!props.transaction) return null;
  return <TransactionDialog key={props.transaction.id} {...props} transaction={props.transaction} />;
}

function TransactionDialog({
  transaction,
  mode = 'edit',
  onClose,
  onSave,
  onDelete,
  onPauseResume,
  isSaving = false,
  isDeleting = false,
  categories,
  currencyOptions,
  currencyOptionsLoading = false,
}: TransactionModalProps & { transaction: Transaction }) {
  const formId = useId();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { loading: currencyLoading } = useCurrency();
  const form = useTransactionForm({ transaction, mode, categories, currencyOptions, onSave });
  const isBusy = isSaving || isDeleting;
  const isLoadingCurrencyData = currencyLoading || currencyOptionsLoading;

  const handleDeleteConfirm = () => {
    onDelete?.();
    setShowDeleteConfirm(false);
  };

  const footer = (
    <FormActions
      formId={formId}
      transaction={transaction}
      canDelete={mode === 'edit' && Boolean(onDelete)}
      onPauseResume={onPauseResume}
      onDelete={() => setShowDeleteConfirm(true)}
      onCancel={onClose}
      isSaving={isSaving}
      isDeleting={isDeleting}
    />
  );

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={mode === 'add' ? 'Add Transaction' : 'Edit Transaction'}
        size="lg"
        dismissible={!isBusy}
        footer={footer}
      >
        <div className="relative">
          {isLoadingCurrencyData && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-1/80 backdrop-blur-sm" role="status">
              <div className="flex flex-col items-center gap-3">
                <Spinner />
                <p className="text-body text-secondary">Loading currency data...</p>
              </div>
            </div>
          )}
          <TransactionForm id={formId} form={form} currencyOptions={currencyOptions} isSaving={isSaving} />
        </div>
      </Dialog>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Transaction"
        message={
          <>
            Are you sure you want to delete <span className="font-bold text-fg">{form.name || 'this transaction'}</span>?
            <br />
            <br />
            This action cannot be undone and will remove the record from your history.
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
}

interface FormActionsProps {
  formId: string;
  transaction: Transaction;
  canDelete: boolean;
  onPauseResume?: (recurringId: number, isActive: boolean) => void;
  onDelete: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}

function FormActions({
  formId,
  transaction,
  canDelete,
  onPauseResume,
  onDelete,
  onCancel,
  isSaving,
  isDeleting,
}: FormActionsProps) {
  const recurringId = transaction.recurringId;
  const isActive = transaction.recurring?.isActive !== false;
  const showPauseResume = recurringId !== undefined && onPauseResume;

  return (
    <>
      {showPauseResume && (
        <Button
          variant="secondary"
          onClick={() => onPauseResume(recurringId, !isActive)}
          disabled={isSaving}
          icon={
            isActive ? (
              <Pause width={16} height={16} strokeWidth={1.5} className="text-warning" aria-hidden="true" />
            ) : (
              <Play width={16} height={16} strokeWidth={1.5} className="text-positive" aria-hidden="true" />
            )
          }
        >
          {isActive ? 'Pause' : 'Resume'}
        </Button>
      )}
      {canDelete && (
        <Button
          variant="danger"
          onClick={onDelete}
          disabled={isSaving}
          loading={isDeleting}
          icon={<Trash width={16} height={16} strokeWidth={1.5} aria-hidden="true" />}
        >
          Delete
        </Button>
      )}
      <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        loading={isSaving}
        icon={<FloppyDisk width={18} height={18} strokeWidth={1.5} aria-hidden="true" />}
      >
        Save Changes
      </Button>
    </>
  );
}
