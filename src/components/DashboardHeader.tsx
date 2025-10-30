'use client';

import { useState } from 'react';
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

  const timePeriodOptions: TimePeriod[] = ['This Month', 'This Quarter', 'This Year', 'All Time'];

  return (
    <div className="flex items-center justify-between mb-8 px-6 pt-6">
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
            className="p-2 rounded-lg hover:bg-accent-purple/20 transition-colors"
            aria-label="Premium"
          >
            <Crown width={24} height={24} strokeWidth={1.5} />
          </button>
          
          <button
            className="p-2 rounded-lg hover:bg-accent-purple/20 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell width={24} height={24} strokeWidth={1.5} />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="p-2 rounded-lg hover:bg-accent-purple/20 transition-colors"
              aria-label="User menu"
            >
              <User width={24} height={24} strokeWidth={1.5} />
            </button>
            
            {isUserMenuOpen && (
              <div className="absolute top-full mt-2 right-0 bg-surface rounded-2xl shadow-lg overflow-hidden z-20 min-w-[180px]">
                <button className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-accent-purple/20 transition-colors text-body">
                  <Settings width={18} height={18} strokeWidth={1.5} />
                  Settings
                </button>
                <button className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-accent-purple/20 transition-colors text-body">
                  <LogOut width={18} height={18} strokeWidth={1.5} />
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

