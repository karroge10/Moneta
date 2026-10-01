'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  HomeSimpleDoor,
  Wallet,
  ShoppingBag,
  LotOfCash,
  BitcoinCircle,
  CalendarCheck,
  Reports,
  LogOut,
  Xmark,
  Settings,
  HeadsetHelp,
} from 'iconoir-react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { cx } from '@/components/ui/cx';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection?: string;
}

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeSimpleDoor, href: '/dashboard' },
  { id: 'income', label: 'Income', icon: Wallet, href: '/income' },
  { id: 'expenses', label: 'Expenses', icon: ShoppingBag, href: '/expenses' },
  { id: 'transactions', label: 'Transactions', icon: LotOfCash, href: '/transactions' },
  { id: 'investments', label: 'Investments', icon: BitcoinCircle, href: '/investments' },
  { id: 'goals', label: 'Goals', icon: CalendarCheck, href: '/goals' },
  { id: 'statistics', label: 'Statistics', icon: Reports, href: '/statistics' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
  { id: 'help', label: 'Help Center', icon: HeadsetHelp, href: '/help' },
];

/**
 * Slide-in navigation for mobile. A modal dialog while open: focus moves into it, Tab stays inside,
 * Escape and the backdrop close it, page scroll is locked. Inert while closed so hidden links are
 * not reachable by keyboard.
 */
export default function MobileDrawer({ isOpen, onClose, activeSection = 'dashboard' }: MobileDrawerProps) {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === 'Tab') trapTab(event, panelRef.current);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut({ redirectUrl: '/' });
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" aria-hidden="true" onClick={onClose} />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        inert={!isOpen}
        onKeyDown={handleKeyDown}
        className={cx(
          'fixed left-0 top-0 z-50 h-full w-80 max-w-[85vw] bg-surface-1 shadow-2xl md:hidden',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line-subtle p-6">
            <Link href={isSignedIn ? '/dashboard' : '/'} className="flex items-center gap-3" onClick={onClose}>
              <Image src="/monetalogo.png" alt="" width={40} height={40} />
              <span className="sidebar-title">MONETA</span>
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="hover-text-purple inline-flex size-11 items-center justify-center rounded-control transition-colors"
              aria-label="Close menu"
            >
              <Xmark width={24} height={24} strokeWidth={1.5} className="stroke-current" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Main" className="flex-1 overflow-y-auto py-4">
            <ul>
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={isActive ? 'page' : undefined}
                      className={cx(
                        'mx-2 mb-1 flex items-center gap-3 rounded-control px-6 py-3 transition-colors',
                        isActive ? 'bg-surface-0 text-accent-fg' : 'hover:bg-surface-0 hover:text-accent-fg',
                      )}
                    >
                      <Icon width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
                      <span className="text-sidebar-button">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {isSignedIn && (
            <div className="border-t border-line-subtle p-4">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-control px-6 py-3 transition-colors hover:bg-surface-0 hover:text-accent-fg"
              >
                <LogOut width={20} height={20} strokeWidth={1.5} aria-hidden="true" />
                <span className="text-sidebar-button">Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])';

function trapTab(event: KeyboardEvent<HTMLDivElement>, container: HTMLElement | null) {
  if (!container) return;
  const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  const elements = Array.from(nodes);
  if (elements.length === 0) return;
  const first = elements[0];
  const last = elements[elements.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
