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

    {/* Content */}
    {/* Mobile: stacked */}
    <div className="md:hidden flex flex-col gap-4 px-4 pb-4">
      <PersonalInformationCard 
        settings={userSettings}
        onEdit={handleEdit}
        onChange={handleChange}
      />
      <LoginHistoryCard history={mockLoginHistory} />
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

    {/* Tablet: two-column split */}
    <div className="hidden md:grid 2xl:hidden md:grid-cols-[1fr_1fr] md:gap-4 md:px-6 md:pb-6">
      <div className="flex flex-col gap-4 min-h-0">
        <PersonalInformationCard 
          settings={userSettings}
          onEdit={handleEdit}
          onChange={handleChange}
        />
        <LoginHistoryCard history={mockLoginHistory} />
      </div>
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

    {/* Desktop: widened ratio */}
    <div className="hidden 2xl:grid 2xl:grid-cols-[1.1fr_0.9fr] 2xl:gap-4 2xl:px-6 2xl:pb-6">
      <div className="flex flex-col gap-4 min-h-0">
        <PersonalInformationCard 
          settings={userSettings}
          onEdit={handleEdit}
          onChange={handleChange}
        />
        <LoginHistoryCard history={mockLoginHistory} />
      </div>
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



