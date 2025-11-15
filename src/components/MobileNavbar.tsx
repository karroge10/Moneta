'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Menu } from 'iconoir-react';
import Dropdown from '@/components/ui/Dropdown';
import { CalendarCheck } from 'iconoir-react';
import { TimePeriod } from '@/types/dashboard';
import MobileDrawer from './MobileDrawer';
import NotificationsDropdown from '@/components/updates/NotificationsDropdown';
import { mockNotifications } from '@/lib/mockData';

interface MobileNavbarProps {
  pageName: string;
  timePeriod?: TimePeriod;
  onTimePeriodChange?: (period: TimePeriod) => void;
  activeSection?: string;
}

export default function MobileNavbar({ pageName, timePeriod, onTimePeriodChange, activeSection = 'dashboard' }: MobileNavbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const timePeriodOptions: TimePeriod[] = ['This Month', 'This Quarter', 'This Year', 'All Time'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isNotificationsOpen]);

  return (
    <>
      <div className="flex items-center justify-between mb-6 px-4 pt-6 md:hidden">
        <h1 className="text-page-title">{pageName}</h1>
        
        <div className="flex items-center gap-3">
          {timePeriod && onTimePeriodChange && (
            <Dropdown
              label="Time Period"
              options={timePeriodOptions}
              value={timePeriod}
              onChange={(value: string) => onTimePeriodChange(value as TimePeriod)}
              iconLeft={<CalendarCheck width={18} height={18} strokeWidth={1.5} />}
            />
          )}
          
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 rounded-lg transition-colors cursor-pointer hover-text-purple"
              aria-label="Notifications"
            >
              <Bell width={20} height={20} strokeWidth={1.5} className="stroke-current" />
            </button>
            <NotificationsDropdown
              notifications={mockNotifications}
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          </div>
          
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 rounded-lg transition-colors cursor-pointer hover-text-purple"
            aria-label="Open menu"
          >
            <Menu width={20} height={20} strokeWidth={1.5} className="stroke-current" />
          </button>
        </div>
      </div>

      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} activeSection={activeSection} />
    </>
  );
}

