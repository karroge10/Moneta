'use client';

import { useEffect } from 'react';
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
  HeadsetHelp,
  LogOut,
  NavArrowLeft,
  Xmark,
} from 'iconoir-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection?: string;
}

export default function MobileDrawer({ isOpen, onClose, activeSection = 'dashboard' }: MobileDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeSimpleDoor, href: '/' },
    { id: 'income', label: 'Income', icon: Wallet, href: '/income' },
    { id: 'expenses', label: 'Expenses', icon: ShoppingBag, href: '/expenses' },
    { id: 'transactions', label: 'Transactions', icon: LotOfCash, href: '/transactions' },
    { id: 'investments', label: 'Investments', icon: BitcoinCircle, href: '/investments' },
    { id: 'goals', label: 'Goals', icon: CalendarCheck, href: '/goals' },
    { id: 'statistics', label: 'Statistics', icon: Reports, href: '/statistics' },
    { id: 'help', label: 'Help Center', icon: HeadsetHelp, href: '/help' },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 left-0 h-full w-80 max-w-[85vw] z-50 md:hidden
          bg-[var(--bg-surface)] shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[rgba(231,228,228,0.1)]">
            <Link href="/" className="flex items-center gap-3" onClick={onClose}>
              <Image src="/monetalogo.png" alt="Moneta" width={40} height={40} priority />
              <span className="sidebar-title">MONETA</span>
            </Link>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors cursor-pointer hover-text-purple"
              aria-label="Close menu"
            >
              <Xmark width={24} height={24} strokeWidth={1.5} className="stroke-current" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-6 py-3 mx-2 mb-1 rounded-[15px]
                    transition-colors cursor-pointer
                    ${isActive 
                      ? 'bg-[var(--bg-primary)] text-[var(--accent-purple)]' 
                      : 'hover:bg-[var(--bg-primary)] hover:text-[var(--accent-purple)]'
                    }
                  `}
                >
                  <Icon width={20} height={20} strokeWidth={1.5} />
                  <span className="text-sidebar-button">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-[rgba(231,228,228,0.1)] p-4">
            <button
              type="button"
              className="flex items-center gap-3 w-full px-6 py-3 rounded-[15px] hover:bg-[var(--bg-primary)] hover:text-[var(--accent-purple)] transition-colors cursor-pointer"
            >
              <LogOut width={20} height={20} strokeWidth={1.5} />
              <span className="text-sidebar-button">Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

