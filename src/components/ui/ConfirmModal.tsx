'use client';

import { useEffect, useRef } from 'react';
import { Xmark } from 'iconoir-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'default';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'default',
}: ConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pointerDownOnOverlay = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onCancel();
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
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const confirmButtonStyle =
    variant === 'danger'
      ? { backgroundColor: '#D93F3F', color: '#E7E4E4' }
      : { backgroundColor: '#AC66DA', color: '#E7E4E4' };

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 z-[70] animate-in fade-in duration-200"
        onMouseDown={() => {
          pointerDownOnOverlay.current = true;
        }}
        onMouseUp={() => {
          if (pointerDownOnOverlay.current && overlayRef.current && !isLoading) {
            onCancel();
          }
          pointerDownOnOverlay.current = false;
        }}
      />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in zoom-in-95 duration-200 pointer-events-none">
        <div
          className="w-full max-w-md rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col pointer-events-auto"
          style={{ backgroundColor: 'var(--bg-surface)' }}
          onMouseDown={() => {
            pointerDownOnOverlay.current = false;
          }}
        >
          <div
            className="flex items-center justify-between p-6 border-b border-[#3a3a3a]"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <h2 className="text-card-header">{title}</h2>
            {!isLoading && (
              <button
                onClick={onCancel}
                className="p-2 rounded-full hover-text-purple transition-colors cursor-pointer"
                aria-label="Close"
              >
                <Xmark width={24} height={24} strokeWidth={1.5} />
              </button>
            )}
          </div>
          <div className="overflow-y-auto p-6 pb-8">
            <p className="text-body" style={{ color: 'var(--text-primary)' }}>
              {message}
            </p>
          </div>
          <div className="flex items-center gap-3 justify-end p-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#282828', color: '#E7E4E4', border: '1px solid #3a3a3a' }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-6 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={confirmButtonStyle}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
