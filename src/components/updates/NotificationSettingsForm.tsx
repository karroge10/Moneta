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
            <div className={`theme-toggle ${isEnabled ? 'is-enabled' : 'is-disabled'}`}>
              <span className="theme-toggle-indicator" aria-hidden="true" />
              <button
                type="button"
                className={`theme-toggle-button ${!isEnabled ? 'active' : ''}`}
                aria-label={`Disable ${row.label}`}
                onClick={() => handleToggle(row.key, false)}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#B9B9B9' }}
                />
              </button>
              <button
                type="button"
                className={`theme-toggle-button ${isEnabled ? 'active' : ''}`}
                aria-label={`Enable ${row.label}`}
                onClick={() => handleToggle(row.key, true)}
              >
                <div className="relative inline-flex items-center justify-center">
                  <div
                    className="blinking-dot"
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#AC66DA',
                      borderRadius: '50%',
                    }}
                  />
                </div>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
