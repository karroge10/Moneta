'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import NotificationsTable from '@/components/updates/NotificationsTable';
import NotificationSettingsCard from '@/components/updates/NotificationSettingsCard';
import { mockNotifications, mockDeletedNotifications, mockNotificationSettings } from '@/lib/mockData';
import { NotificationEntry, NotificationSettings } from '@/types/dashboard';
import { TimePeriod } from '@/types/dashboard';

export default function UpdatesPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');
  const [notifications, setNotifications] = useState<NotificationEntry[]>(mockNotifications);
  const [deletedNotifications, setDeletedNotifications] = useState<NotificationEntry[]>(mockDeletedNotifications);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(mockNotificationSettings);

  const handleDeleteNotification = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      // Move to deleted notifications
      setDeletedNotifications(prev => [notification, ...prev]);
      // Remove from active notifications
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const handleToggleSetting = (key: keyof NotificationSettings, enabled: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: enabled
    }));
    console.log(`Notification setting ${key} toggled to ${enabled}`);
    // TODO: Implement actual API call to save settings
  };

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Updates"
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Updates" 
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          activeSection="updates"
        />
      </div>

      {/* Content - 2 Column Layout */}
      <div className="flex flex-col md:grid md:grid-cols-[1fr_1fr] gap-4 px-4 md:px-6 pb-6 md:h-[calc(100vh-120px)]">
        {/* Left Column - Latest Notifications */}
        <div className="flex flex-col gap-4 min-h-0 h-full">
          <NotificationsTable 
            notifications={notifications}
            title="Latest Notifications"
            onDelete={handleDeleteNotification}
            showDeleteIcon={true}
            useFullHeight={true}
          />
        </div>

        {/* Right Column - Settings + Deleted Notifications */}
        <div className="flex flex-col gap-4 min-h-0 h-full">
          <NotificationSettingsCard 
            settings={notificationSettings}
            onToggle={handleToggleSetting}
          />
          
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <NotificationsTable 
              notifications={deletedNotifications}
              title="Deleted Notifications"
              showDeleteIcon={false}
              showInfoText={true}
              useFullHeight={true}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
