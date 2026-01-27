'use client';

import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import NotificationsTable from '@/components/updates/NotificationsTable';
import NotificationSettingsCard from '@/components/updates/NotificationSettingsCard';
import { mockNotificationSettings } from '@/lib/mockData';
import { NotificationEntry, NotificationSettings } from '@/types/dashboard';
import { TimePeriod } from '@/types/dashboard';
import { useNotifications } from '@/hooks/useNotifications';

export default function UpdatesPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');
  const [deletedNotifications, setDeletedNotifications] = useState<NotificationEntry[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(mockNotificationSettings);
  
  // Fetch real notifications (all, not just unread)
  const { notifications, isLoading: notificationsLoading, refresh: refreshNotifications } = useNotifications(50, false);

  const handleDeleteNotification = async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      // Move to deleted notifications (local state only - could add API endpoint later)
      setDeletedNotifications(prev => [notification, ...prev]);
      // Refresh to remove from list (or mark as deleted in DB if we add that endpoint)
      await refreshNotifications();
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

    {/* Content */}
    {/* Mobile: stacked */}
    <div className="md:hidden flex flex-col gap-4 px-4 pb-4">
      <NotificationsTable 
        notifications={notifications}
        title="Latest Notifications"
        onDelete={handleDeleteNotification}
        showDeleteIcon={true}
        useFullHeight={true}
      />
      <NotificationSettingsCard 
        settings={notificationSettings}
        onToggle={handleToggleSetting}
      />
      <NotificationsTable 
        notifications={deletedNotifications}
        title="Deleted Notifications"
        showDeleteIcon={false}
        showInfoText={true}
        useFullHeight={true}
      />
    </div>

    {/* Tablet: balanced columns */}
    <div className="hidden md:grid 2xl:hidden md:grid-cols-[1fr_1fr] md:gap-4 md:px-6 md:pb-6 md:h-[calc(100vh-120px)]">
      <div className="flex flex-col gap-4 min-h-0 h-full">
        <NotificationsTable 
          notifications={notifications}
          title="Latest Notifications"
          onDelete={handleDeleteNotification}
          showDeleteIcon={true}
          useFullHeight={true}
        />
      </div>
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

    {/* Desktop: weighted split */}
    <div className="hidden 2xl:grid 2xl:grid-cols-[1.1fr_0.9fr] 2xl:gap-4 2xl:px-6 2xl:pb-6 2xl:h-[calc(100vh-120px)]">
      <div className="flex flex-col gap-4 min-h-0 h-full">
        <NotificationsTable 
          notifications={notifications}
          title="Latest Notifications"
          onDelete={handleDeleteNotification}
          showDeleteIcon={true}
          useFullHeight={true}
        />
      </div>
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
