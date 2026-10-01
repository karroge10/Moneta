'use client';

import { useState } from 'react';
import type { ToastType } from '@/components/ui/Toast';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

/** Local toast stack for a page; render with <ToastContainer toasts={toasts} onRemove={removeToast} />. */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (message: string, type: ToastType = 'success') => {
    const toast: ToastItem = { id: crypto.randomUUID(), message, type };
    setToasts((prev) => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return { toasts, addToast, removeToast };
}
