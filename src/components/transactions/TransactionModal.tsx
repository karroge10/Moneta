'use client';

import { useEffect, useRef } from 'react';
import { Xmark } from 'iconoir-react';
import { Transaction } from '@/types/dashboard';
import TransactionForm from './TransactionForm';

interface TransactionModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
}

export default function TransactionModal({ transaction, onClose, onSave }: TransactionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  if (!transaction) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-[#3a3a3a] bg-[var(--bg-surface)] z-10">
            <h2 className="text-card-header">Edit Transaction</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover-text-purple transition-colors cursor-pointer"
              aria-label="Close"
            >
              <Xmark width={24} height={24} strokeWidth={1.5} />
            </button>
          </div>
          
          <div className="p-6">
            <TransactionForm
              transaction={transaction}
              onSave={onSave}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>
    </>
  );
}


