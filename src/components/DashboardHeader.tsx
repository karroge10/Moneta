'use client';

import { useState, useRef, useEffect } from 'react';
import { Crown, Bell, Settings, LogOut, Plus, HeadsetHelp } from 'iconoir-react';
import Dropdown from '@/components/ui/Dropdown';
import { CalendarCheck } from 'iconoir-react';
import { TimePeriod } from '@/types/dashboard';
import Link from 'next/link';
import NotificationsDropdown from '@/components/updates/NotificationsDropdown';
import { mockNotifications } from '@/lib/mockData';

interface DashboardHeaderProps {
  pageName?: string;
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

export default function DashboardHeader({ pageName = 'Dashboard', timePeriod, onTimePeriodChange, actionButton }: DashboardHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const timePeriodOptions: TimePeriod[] = ['This Month', 'This Quarter', 'This Year', 'All Time'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between mb-8 px-6 pt-7">
      <h1 className="text-page-title">{pageName}</h1>
      
      <div className="flex items-center gap-4">
        {actionButton && (
          <button
            onClick={actionButton.onClick}
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-colors cursor-pointer hover:opacity-90"
            style={{ backgroundColor: '#E7E4E4', color: '#282828' }}
          >
            <Plus width={18} height={18} strokeWidth={1.5} />
            <span className="text-sm font-semibold">{actionButton.label}</span>
          </button>
        )}
        <Dropdown
          label="Time Period"
          options={timePeriodOptions}
          value={timePeriod}
          onChange={(value: string) => onTimePeriodChange(value as TimePeriod)}
          iconLeft={<CalendarCheck width={20} height={20} strokeWidth={1.5} />}
        />
        
        <div className="flex items-center gap-4">
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 rounded-lg transition-colors relative cursor-pointer hover-text-purple"
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
          
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="p-2 rounded-lg transition-colors cursor-pointer hover-text-purple"
              aria-label="Settings menu"
            >
              <Settings width={20} height={20} strokeWidth={1.5} className="stroke-current" />
            </button>
            
            {isUserMenuOpen && (
              <div className="absolute top-full mt-2 right-0 rounded-2xl shadow-lg overflow-hidden z-20 min-w-[180px]" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <Link 
                  href="/settings" 
                  className="w-full text-left px-4 py-3 flex items-center gap-2 hover-text-purple transition-colors text-body cursor-pointer"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Settings width={18} height={18} strokeWidth={1.5} className="stroke-current" />
                  Settings
                </Link>
                <Link 
                  href="/help" 
                  className="w-full text-left px-4 py-3 flex items-center gap-2 hover-text-purple transition-colors text-body cursor-pointer"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <HeadsetHelp width={18} height={18} strokeWidth={1.5} className="stroke-current" />
                  Help Center
                </Link>
                <Link 
                  href="/pricing" 
                  className="w-full text-left px-4 py-3 flex items-center gap-2 hover-text-purple transition-colors text-body cursor-pointer"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Crown width={18} height={18} strokeWidth={1.5} className="stroke-current" />
                  Premium
                </Link>
                <button 
                  className="w-full text-left px-4 py-3 flex items-center gap-2 hover-text-purple transition-colors text-body cursor-pointer"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    // TODO: Implement logout functionality
                    console.log('Log out');
                  }}
                >
                  <LogOut width={18} height={18} strokeWidth={1.5} className="stroke-current" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

