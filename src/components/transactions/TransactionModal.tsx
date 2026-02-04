'use client';

import { useEffect, useRef, useState } from 'react';
import { Xmark } from 'iconoir-react';
import { Transaction, Category } from '@/types/dashboard';
import TransactionForm from './TransactionForm';
import { useCurrency } from '@/hooks/useCurrency';
import Spinner from '@/components/ui/Spinner';

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
  currencyOptions: Array<{ id: number; name: string; symbol: string; alias: string }>;
  currencyOptionsLoading?: boolean;
}

export default function TransactionModal({
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
}: TransactionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pointerDownOnOverlay = useRef(false);
  const [isFloatingPanelOpen, setIsFloatingPanelOpen] = useState(false);
  const { loading: currencyLoading } = useCurrency();
  
  // Show loading overlay when currency or currencyOptions are loading
  const isLoadingCurrencyData = currencyLoading || currencyOptionsLoading;

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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

  if (!transaction) return null;

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onMouseDown={() => {
          pointerDownOnOverlay.current = true;
        }}
        onMouseUp={() => {
          if (pointerDownOnOverlay.current && overlayRef.current) {
            onClose();
          }
          pointerDownOnOverlay.current = false;
        }}
      />
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200 pointer-events-none"
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
            <h2 className="text-card-header">
              {mode === 'add' ? 'Add Transaction' : 'Edit Transaction'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover-text-purple transition-colors cursor-pointer"
              aria-label="Close"
            >
              <Xmark width={24} height={24} strokeWidth={1.5} />
            </button>
          </div>
          <div className={`flex-1 ${isFloatingPanelOpen ? 'overflow-visible' : 'overflow-y-auto'} relative`}>
            {isLoadingCurrencyData && (
              <div className="absolute inset-0 bg-[#282828]/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-b-3xl">
                <div className="flex flex-col items-center gap-3">
                  <Spinner />
                  <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                    Loading currency data...
                  </p>
                </div>
              </div>
            )}
            <div className="p-6 pb-8">
              <TransactionForm
                transaction={transaction}
                mode={mode}
                onSave={onSave}
                onCancel={onClose}
                onDelete={onDelete}
                onPauseResume={onPauseResume}
                onFloatingPanelToggle={setIsFloatingPanelOpen}
                isSaving={isSaving}
                isDeleting={isDeleting}
                categories={categories}
                currencyOptions={currencyOptions}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

