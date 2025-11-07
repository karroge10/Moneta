'use client';

import { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import PersonalInformationCard from '@/components/settings/PersonalInformationCard';
import LoginHistoryCard from '@/components/settings/LoginHistoryCard';
import SecurityDetailsCard from '@/components/settings/SecurityDetailsCard';
import FinancialMilestonesCard from '@/components/settings/FinancialMilestonesCard';
import DataSharingCard from '@/components/settings/DataSharingCard';
import { mockUserSettings, mockLoginHistory, mockAchievements } from '@/lib/mockData';
import { UserSettings } from '@/types/dashboard';
import { TimePeriod } from '@/types/dashboard';

export default function SettingsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');
  const [userSettings, setUserSettings] = useState<UserSettings>(mockUserSettings);

  const handleEdit = (field: string) => {
    console.log('Edit field:', field);
    // TODO: Implement edit functionality
  };

  const handleChange = (field: string, value: string) => {
    setUserSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSetup2FA = () => {
    console.log('Setup 2FA');
    // TODO: Implement 2FA setup
  };

  const handleDeleteAccount = () => {
    console.log('Delete account');
    // TODO: Implement account deletion
  };

  const handleDataSharingToggle = (enabled: boolean) => {
    console.log('Data sharing:', enabled);
    // TODO: Implement data sharing toggle
  };

  return (
    <main className="min-h-screen bg-[#202020]">
      {/* Desktop Header */}
      <div className="hidden md:block">
        <DashboardHeader 
          pageName="Settings"
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
        />
      </div>

      {/* Mobile Navbar */}
      <div className="md:hidden">
        <MobileNavbar 
          pageName="Settings" 
          timePeriod={timePeriod} 
          onTimePeriodChange={setTimePeriod}
          activeSection="settings"
        />
      </div>

      {/* Content - 2 Column Layout */}
      <div className="flex flex-col md:grid md:grid-cols-[1fr_1fr] gap-4 px-4 md:px-6 pb-6">
        {/* Left Column */}
        <div className="flex flex-col gap-4 min-h-0">
          <PersonalInformationCard 
            settings={userSettings}
            onEdit={handleEdit}
            onChange={handleChange}
          />
          <LoginHistoryCard history={mockLoginHistory} />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 min-h-0">
          <SecurityDetailsCard 
            settings={userSettings}
            onEdit={handleEdit}
            onChange={handleChange}
            onSetup2FA={handleSetup2FA}
            onDeleteAccount={handleDeleteAccount}
          />
          <FinancialMilestonesCard achievements={mockAchievements} />
          <DataSharingCard 
            isEnabled={true}
            onToggle={handleDataSharingToggle}
          />
        </div>
      </div>
    </main>
  );
}

