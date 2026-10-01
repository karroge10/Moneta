'use client';

import { useEffect, useId, useRef, type ReactNode, type KeyboardEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Xmark } from 'iconoir-react';
import { cx } from '@/components/ui/cx';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

export interface DialogProps {
  open: boolean;
  /** Called on Escape, backdrop click and the close button, unless `dismissible` is false. */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Max width: sm 400, md 480 (default), lg 640, xl 800. */
  size?: DialogSize;
  children?: ReactNode;
  /** Action row pinned below the scrollable body, usually Buttons. */
  footer?: ReactNode;
  /** Close when the backdrop is clicked. Default true. */
  closeOnBackdrop?: boolean;
  /** When false, Escape, backdrop and the close button do nothing (e.g. while saving). Default true. */
  dismissible?: boolean;
  /** Element to focus on open; defaults to the first focusable element in the body or footer. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Accessible modal: role="dialog", aria-modal, labelled by the title, focus trapped inside, Escape
 * closes, focus returns to the trigger, page scroll locked. Bottom sheet on mobile, centered from sm up.
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  dismissible = true,
  initialFocusRef,
  className,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const pointerDownOnBackdrop = useRef(false);

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const unlockScroll = lockScroll();
    const panel = panelRef.current;
    const target = initialFocusRef?.current ?? firstFocusable(panel) ?? panel;
    target?.focus();

    return () => {
      unlockScroll();
      trigger?.focus?.();
    };
  }, [open, initialFocusRef]);

  if (!open || typeof document === 'undefined') return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (dismissible) onClose();
      return;
    }
    if (event.key === 'Tab') trapTab(event, panelRef.current);
  };

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    pointerDownOnBackdrop.current = event.target === event.currentTarget;
  };

  const handleBackdropMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    const startedAndEndedOnBackdrop = pointerDownOnBackdrop.current && event.target === event.currentTarget;
    pointerDownOnBackdrop.current = false;
    if (startedAndEndedOnBackdrop && closeOnBackdrop && dismissible) onClose();
  };

  const dialog = (
    <div
      className="dialog-backdrop fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cx(
          'dialog-panel flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-t-panel bg-surface-1 text-fg shadow-2xl outline-none',
          'sm:max-h-[calc(100dvh-2rem)] sm:rounded-card',
          SIZE_CLASS[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-heading font-semibold text-balance">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-ui text-secondary text-pretty">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-m-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-2 hover:text-accent-fg focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Xmark width={22} height={22} strokeWidth={1.5} />
            </button>
          )}
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-3 px-5 pb-5 pt-2 sm:flex-row sm:justify-end sm:px-6 sm:pb-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

const SIZE_CLASS: Record<DialogSize, string> = {
  sm: 'sm:max-w-[400px]',
  md: 'sm:max-w-[480px]',
  lg: 'sm:max-w-[640px]',
  xl: 'sm:max-w-[800px]',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let scrollLockCount = 0;
let savedOverflow = '';

/** Locks page scroll; nested dialogs share one lock. Returns the unlock function. */
function lockScroll(): () => void {
  if (scrollLockCount === 0) {
    savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
  }
  scrollLockCount += 1;
  return () => {
    scrollLockCount -= 1;
    if (scrollLockCount === 0) document.documentElement.style.overflow = savedOverflow;
  };
}

function focusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(nodes).filter((node) => node.getClientRects().length > 0);
}

function firstFocusable(container: HTMLElement | null): HTMLElement | null {
  const elements = focusableElements(container);
  const nonClose = elements.find((element) => element.getAttribute('aria-label') !== 'Close');
  return nonClose ?? elements[0] ?? null;
}

function trapTab(event: KeyboardEvent<HTMLDivElement>, container: HTMLElement | null) {
  const elements = focusableElements(container);
  if (elements.length === 0) {
    event.preventDefault();
    return;
  }
  const first = elements[0];
  const last = elements[elements.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
