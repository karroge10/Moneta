'use client';

import { useState, useEffect } from 'react';
import { NotificationSettings } from '@/types/dashboard';

interface NotificationSettingsFormProps {
  settings: NotificationSettings;
  onToggle?: (key: keyof NotificationSettings, enabled: boolean) => void;
}

interface SettingRow {
  key: keyof NotificationSettings;
  label: string;
}

const settingRows: SettingRow[] = [
  { key: 'pushNotifications', label: 'Push Notifications' },
  { key: 'upcomingBills', label: 'Upcoming Bills' },
  { key: 'upcomingIncome', label: 'Upcoming Income' },
  { key: 'investments', label: 'Investments' },
  { key: 'goals', label: 'Goals' },
  { key: 'promotionalEmail', label: 'Promotional Email' },
  { key: 'aiInsights', label: 'AI Insights' },
];

export default function NotificationSettingsForm({
  settings,
  onToggle,
}: NotificationSettingsFormProps) {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggle = (key: keyof NotificationSettings, enabled: boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: enabled
    }));
    onToggle?.(key, enabled);
  };

  return (
    <div className="flex flex-col gap-4">
      {settingRows.map((row) => {
        const isEnabled = localSettings[row.key];
        return (
          <div
            key={row.key}
            className="flex items-center justify-between"
          >
            <span className="text-body" style={{ color: '#E7E4E4' }}>
              {row.label}
            </span>
            <button
              type="button"
              onClick={() => handleToggle(row.key, !isEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                isEnabled ? 'bg-[var(--accent-purple)]' : 'bg-[rgba(231,228,228,0.3)]'
              }`}
              aria-label={isEnabled ? `Disable ${row.label}` : `Enable ${row.label}`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ease-in-out ${
                  isEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
