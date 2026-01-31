'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import NotificationsTable from '@/components/updates/NotificationsTable';
import NotificationSettingsModal from '@/components/updates/NotificationSettingsModal';
import Card from '@/components/ui/Card';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/notification-settings-constants';
import type { NotificationSettings } from '@/types/dashboard';
import { useNotifications } from '@/hooks/useNotifications';
import { Settings } from 'iconoir-react';

export default function NotificationsPage() {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { notifications, isLoading: notificationsLoading } = useNotifications(50, false);

  const fetchNotificationSettings = useCallback(() => {
    fetch('/api/user/settings')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (data.notificationSettings) {
          setNotificationSettings(data.notificationSettings);
        }
      })
      .catch(() => setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS));
  }, []);

  useEffect(() => {
    fetchNotificationSettings();
  }, [fetchNotificationSettings]);

  const handleToggleSetting = useCallback(async (key: keyof NotificationSettings, enabled: boolean) => {
    const next = { ...notificationSettings, [key]: enabled };
    setNotificationSettings(next);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationSettings: next }),
      });
      if (!res.ok) fetchNotificationSettings();
    } catch {
      fetchNotificationSettings();
    }
  }, [notificationSettings, fetchNotificationSettings]);

  return (
    <main className="min-h-screen bg-[#202020]">
      <div className="hidden md:block">
        <DashboardHeader pageName="Notifications" />
      </div>

      <div className="md:hidden">
        <MobileNavbar
          pageName="Notifications"
          activeSection="notifications"
        />
      </div>

      <div className="px-4 md:px-6 lg:px-8 pb-6 flex flex-col h-[calc(100vh-120px)] min-h-0">
        <div className="flex flex-col flex-1 min-h-0">
          <Card
            title="Latest Notifications"
            showActions={false}
            customHeader={
              <div className="mb-4 flex items-center justify-between shrink-0">
                <h2 className="text-card-header">Latest Notifications</h2>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="flex items-center gap-2 p-2 rounded-full hover-text-purple transition-colors cursor-pointer"
                  aria-label="Settings"
                >
                  <Settings width={20} height={20} strokeWidth={1.5} />
                </button>
              </div>
            }
            className="flex-1 flex flex-col min-h-0 w-full"
          >
            <div className="flex flex-col flex-1 min-h-0">
              <NotificationsTable
                notifications={notifications}
                isLoading={notificationsLoading}
              />
            </div>
          </Card>
        </div>
      </div>

      <NotificationSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={notificationSettings}
        onToggle={handleToggleSetting}
      />
    </main>
  );
}
