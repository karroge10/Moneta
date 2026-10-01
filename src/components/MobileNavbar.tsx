'use client';

import { useRef, useState } from 'react';
import { Menu, CalendarCheck } from 'iconoir-react';
import Dropdown from '@/components/ui/Dropdown';
import { TimePeriod } from '@/types/dashboard';
import MobileDrawer from './MobileDrawer';
import NotificationBell from '@/components/notifications/NotificationBell';

interface MobileNavbarProps {
  pageName: string;
  timePeriod?: TimePeriod;
  onTimePeriodChange?: (period: TimePeriod) => void;
  activeSection?: string;
}

const TIME_PERIOD_OPTIONS: TimePeriod[] = ['This Month', 'This Year', 'All Time'];

export default function MobileNavbar({ pageName, timePeriod, onTimePeriodChange, activeSection = 'dashboard' }: MobileNavbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    <>
      <header className="mb-6 flex items-center justify-between px-4 pt-6 md:hidden">
        <h1 className="text-page-title text-balance">{pageName}</h1>

        <div className="flex items-center gap-1">
          {timePeriod && onTimePeriodChange && (
            <Dropdown
              label="Time Period"
              options={TIME_PERIOD_OPTIONS}
              value={timePeriod}
              onChange={(value: string) => onTimePeriodChange(value as TimePeriod)}
              iconLeft={<CalendarCheck width={18} height={18} strokeWidth={1.5} />}
            />
          )}

          <NotificationBell />

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="hover-text-purple inline-flex size-11 items-center justify-center rounded-control transition-colors"
            aria-label="Open menu"
            aria-expanded={isDrawerOpen}
            aria-haspopup="dialog"
          >
            <Menu width={20} height={20} strokeWidth={1.5} className="stroke-current" aria-hidden="true" />
          </button>
        </div>
      </header>

      <MobileDrawer isOpen={isDrawerOpen} onClose={closeDrawer} activeSection={activeSection} />
    </>
  );
}
