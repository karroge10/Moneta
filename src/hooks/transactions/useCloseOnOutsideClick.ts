'use client';

import { useEffect, type RefObject } from 'react';

/** Calls `onClose` on a mousedown outside `ref` while `isOpen` is true. */
export function useCloseOnOutsideClick(ref: RefObject<HTMLElement | null>, isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [ref, isOpen, onClose]);
}
