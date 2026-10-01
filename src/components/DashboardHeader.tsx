'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Settings, LogOut, Plus, HeadsetHelp, CalendarCheck } from 'iconoir-react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import NotificationBell from '@/components/notifications/NotificationBell';
import Dropdown from '@/components/ui/Dropdown';
import { cx } from '@/components/ui/cx';
import { TimePeriod } from '@/types/dashboard';

interface ActionButton {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface DashboardHeaderProps {
  pageName?: string;
  actionButton?: ActionButton;
  secondaryButton?: ActionButton;
  actionButtons?: ActionButton[];
  timePeriod?: TimePeriod;
  onTimePeriodChange?: (period: TimePeriod) => void;
}

const TIME_PERIOD_OPTIONS: TimePeriod[] = [
  'This Month',
  'Last Month',
  'This Year',
  'Last Year',
  'All Time',
];

export default function DashboardHeader({
  pageName = 'Dashboard',
  actionButton,
  secondaryButton,
  actionButtons,
  timePeriod = 'This Month',
  onTimePeriodChange,
}: DashboardHeaderProps) {
  const allButtons = actionButtons || [
    ...(secondaryButton ? [secondaryButton] : []),
    ...(actionButton ? [actionButton] : []),
  ];

  return (
    <header className="mb-8 flex items-center justify-between px-6 pt-7">
      <h1 className="text-page-title text-balance">{pageName}</h1>

      <div className="flex items-center gap-4">
        {allButtons.map((btn, index) => {
          const isSecondary = btn === secondaryButton;
          return (
            <button
              key={index}
              type="button"
              onClick={btn.onClick}
              disabled={btn.disabled}
              className={cx(
                'flex h-10 items-center gap-2 rounded-full px-4 transition-[background-color,opacity,scale] active:scale-[0.96]',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                isSecondary
                  ? 'border border-accent/30 bg-accent/15 text-accent-fg hover:bg-accent/25'
                  : 'bg-fg text-surface-1 hover:opacity-90',
              )}
            >
              {!isSecondary && (btn.icon || <Plus width={18} height={18} strokeWidth={1.5} aria-hidden="true" />)}
              <span className="text-ui font-semibold">{btn.label}</span>
            </button>
          );
        })}

        <div className="flex items-center gap-2">
          {onTimePeriodChange && (
            <Dropdown
              label="Time Period"
              options={TIME_PERIOD_OPTIONS}
              value={timePeriod}
              onChange={(value) => onTimePeriodChange(value as TimePeriod)}
              iconLeft={<CalendarCheck width={16} height={16} strokeWidth={1.5} />}
            />
          )}
          <NotificationBell />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

/** Settings, Help and Log out behind the gear button. Closes on outside click and Escape. */
function UserMenu() {
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const handleSignOut = async () => {
    close();
    await signOut({ redirectUrl: '/' });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="hover-text-purple inline-flex size-10 items-center justify-center rounded-control transition-colors"
        aria-label="Account menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
      >
        <Settings width={20} height={20} strokeWidth={1.5} className="stroke-current" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id={menuId}
          className="absolute right-0 top-full z-20 mt-2 min-w-[180px] overflow-hidden rounded-panel bg-surface-1 shadow-lg"
        >
          <Link href="/settings" className={MENU_ITEM_CLASS} onClick={close}>
            <Settings width={18} height={18} strokeWidth={1.5} className="stroke-current" aria-hidden="true" />
            Settings
          </Link>
          <Link href="/help" className={MENU_ITEM_CLASS} onClick={close}>
            <HeadsetHelp width={18} height={18} strokeWidth={1.5} className="stroke-current" aria-hidden="true" />
            Help Center
          </Link>
          <button type="button" className={MENU_ITEM_CLASS} onClick={handleSignOut}>
            <LogOut width={18} height={18} strokeWidth={1.5} className="stroke-current" aria-hidden="true" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

const MENU_ITEM_CLASS =
  'hover-text-purple flex w-full items-center gap-2 px-4 py-3 text-left text-copy transition-colors hover:bg-surface-2';
