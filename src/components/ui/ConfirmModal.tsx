'use client';

import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'default';
}

/** Yes/no confirmation built on Dialog. Cannot be dismissed while `isLoading`. */
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
  const footer = (
    <>
      <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
        {cancelLabel}
      </Button>
      <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={isLoading}>
        {confirmLabel}
      </Button>
    </>
  );

  return (
    <Dialog open={isOpen} onClose={onCancel} title={title} size="md" dismissible={!isLoading} footer={footer}>
      <div className="text-copy text-secondary text-pretty">{message}</div>
    </Dialog>
  );
}
