'use client';

import { useEffect, useRef, useState } from 'react';
import { Xmark } from 'iconoir-react';
import { Transaction, Category } from '@/types/dashboard';
import TransactionForm from './TransactionForm';

interface TransactionModalProps {
  transaction: Transaction | null;
  mode?: 'add' | 'edit';
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  onDelete?: () => void;
  isSaving?: boolean;
  categories: Category[];
  currencyOptions: Array<{ id: number; name: string; symbol: string; alias: string }>;
}

export default function TransactionModal({
  transaction,
  mode = 'edit',
  onClose,
  onSave,
  onDelete,
  isSaving = false,
  categories,
  currencyOptions,
}: TransactionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isFloatingPanelOpen, setIsFloatingPanelOpen] = useState(false);

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
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200"
        onClick={event => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className="w-full max-w-2xl max-h-[94vh] rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col"
          style={{ backgroundColor: 'var(--bg-surface)' }}
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
          <div className={`flex-1 ${isFloatingPanelOpen ? 'overflow-visible' : 'overflow-y-auto'}`}>
            <div className="p-6 pb-8">
              <TransactionForm
                transaction={transaction}
                mode={mode}
                onSave={onSave}
                onCancel={onClose}
                onDelete={onDelete}
                onFloatingPanelToggle={setIsFloatingPanelOpen}
                isSaving={isSaving}
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

