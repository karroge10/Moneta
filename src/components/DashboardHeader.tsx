'use client';

import { useState, useRef, useEffect } from 'react';
import { Crown, Bell, User, Settings, LogOut } from 'iconoir-react';
import Dropdown from '@/components/ui/Dropdown';
import { CalendarCheck } from 'iconoir-react';
import { TimePeriod } from '@/types/dashboard';

interface DashboardHeaderProps {
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
}

export default function DashboardHeader({ timePeriod, onTimePeriodChange }: DashboardHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const timePeriodOptions: TimePeriod[] = ['This Month', 'This Quarter', 'This Year', 'All Time'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between mb-8 px-6 pt-7">
      <h1 className="text-page-title">Dashboard</h1>
      
      <div className="flex items-center gap-4">
        <Dropdown
          label="Time Period"
          options={timePeriodOptions}
          value={timePeriod}
          onChange={(value: string) => onTimePeriodChange(value as TimePeriod)}
          iconLeft={<CalendarCheck width={20} height={20} strokeWidth={1.5} />}
        />
        
        <div className="flex items-center gap-4">
          <button
            className="p-2 rounded-lg transition-colors cursor-pointer hover-text-purple"
            aria-label="Premium"
          >
            <Crown width={20} height={20} strokeWidth={1.5} className="stroke-current" />
          </button>
          
          <button
            className="p-2 rounded-lg transition-colors relative cursor-pointer hover-text-purple"
            aria-label="Notifications"
          >
            <Bell width={20} height={20} strokeWidth={1.5} className="stroke-current" />
          </button>
          
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="p-2 rounded-lg transition-colors cursor-pointer hover-text-purple"
              aria-label="User menu"
            >
              <User width={20} height={20} strokeWidth={1.5} className="stroke-current" />
            </button>
            
            {isUserMenuOpen && (
              <div className="absolute top-full mt-2 right-0 rounded-2xl shadow-lg overflow-hidden z-20 min-w-[180px]" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <button className="w-full text-left px-4 py-3 flex items-center gap-2 hover-text-purple transition-colors text-body cursor-pointer">
                  <User width={18} height={18} strokeWidth={1.5} className="stroke-current" />
                  Profile
                </button>
                <button className="w-full text-left px-4 py-3 flex items-center gap-2 hover-text-purple transition-colors text-body cursor-pointer">
                  <Settings width={18} height={18} strokeWidth={1.5} className="stroke-current" />
                  Settings
                </button>
                <button className="w-full text-left px-4 py-3 flex items-center gap-2 hover-text-purple transition-colors text-body cursor-pointer">
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

