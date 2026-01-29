'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import PersonalInformationCard from '@/components/settings/PersonalInformationCard';
import LoginHistoryCard from '@/components/settings/LoginHistoryCard';
import SecurityDetailsCard from '@/components/settings/SecurityDetailsCard';
import FinancialMilestonesCard from '@/components/settings/FinancialMilestonesCard';
import DataSharingCard from '@/components/settings/DataSharingCard';
import { mockLoginHistory, mockAchievements } from '@/lib/mockData';
import { UserSettings } from '@/types/dashboard';
import { TimePeriod } from '@/types/dashboard';
import { Trash } from 'iconoir-react';

type LanguageOption = { id: number; name: string; alias: string };
type CurrencyOption = { id: number; name: string; symbol: string; alias: string };

const emptySettings: UserSettings = {
  name: '',
  username: '',
  email: '',
  jobPosition: '',
  age: 0,
  city: '',
  country: '',
  language: '',
  currency: '',
  dateOfBirth: '',
  profession: '',
  defaultPage: 'Dashboard',
  plan: 'basic',
  incomeTaxRate: null,
};

function mapApiToUserSettings(data: {
  firstName?: string | null;
  lastName?: string | null;
  userName?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  country?: string | null;
  city?: string | null;
  profession?: string | null;
  language?: { id: number; name: string; alias: string } | null;
  currency?: { id: number; name: string; symbol: string; alias: string } | null;
  defaultPage?: string | null;
  plan?: string | null;
  incomeTaxRate?: number | null;
}): UserSettings {
  const name = [data.firstName, data.lastName].filter(Boolean).join(' ') || '';
  return {
    ...emptySettings,
    name,
    username: data.userName ?? '',
    email: data.email ?? '',
    city: data.city ?? '',
    country: data.country ?? '',
    profession: data.profession ?? '',
    language: data.language?.name ?? '',
    currency: data.currency ? `${data.currency.symbol} ${data.currency.alias}` : '',
    dateOfBirth: data.dateOfBirth ?? '',
    defaultPage: data.defaultPage ?? 'Dashboard',
    plan: data.plan ?? 'basic',
    incomeTaxRate: data.incomeTaxRate ?? null,
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const { signOut, openUserProfile } = useClerk();
  const { user } = useUser();
  const userImageUrl = user?.imageUrl ?? null;
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');
  const [userSettings, setUserSettings] = useState<UserSettings>(emptySettings);
  const [incomeTaxRate, setIncomeTaxRate] = useState<number | null>(null);
  const [dataSharingEnabled, setDataSharingEnabled] = useState(true);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/user/settings');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setUserSettings(mapApiToUserSettings(data));
      setIncomeTaxRate(data.incomeTaxRate ?? null);
      setDataSharingEnabled(data.dataSharingEnabled ?? true);
      setLanguages(data.languages ?? []);
      setCurrencies(data.currencies ?? []);
    } catch {
      setUserSettings(emptySettings);
      setIncomeTaxRate(null);
      setDataSharingEnabled(true);
      setLanguages([]);
      setCurrencies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSettingsPatch = useCallback(async (body: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update settings');
      }
      const data = await res.json();
      if (data.settings) {
        setUserSettings(mapApiToUserSettings(data.settings));
        setIncomeTaxRate(data.settings.incomeTaxRate ?? null);
        if (data.settings.dataSharingEnabled !== undefined) {
          setDataSharingEnabled(data.settings.dataSharingEnabled);
        }
      }
    } catch (err) {
      console.error('Settings update failed:', err);
      throw err;
    }
  }, []);

  const handleEdit = (field: string) => {
    // Inline edit or modal can be wired here; for now no-op for fields that need custom UI
    if (field === 'name' || field === 'username' || field === 'email' || field === 'password' || field === 'profession') {
      // Will be wired in Security/Personal cards with actual inputs
    }
  };

  const handleChange = useCallback((field: string, value: string) => {
    setUserSettings((prev) => ({ ...prev, [field]: value }));
    const body: Record<string, unknown> = {};
    if (field === 'country') body.country = value;
    if (field === 'profession') body.profession = value || null;
    if (field === 'dateOfBirth') body.dateOfBirth = value || null;
    if (field === 'defaultPage') body.defaultPage = value;
    if (field === 'username') body.userName = value || null;
    if (field === 'language') {
      const lang = languages.find((l) => l.name === value);
      if (lang) body.languageId = lang.id;
    }
    if (field === 'currency') {
      const curr = currencies.find((c) => `${c.symbol} ${c.alias}` === value);
      if (curr) body.currencyId = curr.id;
    }
    if (Object.keys(body).length > 0) {
      handleSettingsPatch(body).catch(() => {});
    }
  }, [languages, currencies, handleSettingsPatch]);

  const handleOpenAccountProfile = () => {
    openUserProfile?.();
  };

  const handleDeleteAccountClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteAccountConfirm = async () => {
    setDeleteInProgress(true);
    try {
      const res = await fetch('/api/user/account', { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete account');
      }
      setShowDeleteModal(false);
      await signOut({ redirectUrl: '/' });
      router.push('/');
    } catch (err) {
      console.error('Delete account failed:', err);
      setDeleteInProgress(false);
    }
  };

  const handleDataSharingToggle = useCallback(async (enabled: boolean) => {
    setDataSharingEnabled(enabled);
    try {
      await handleSettingsPatch({ dataSharingEnabled: enabled });
    } catch {
      setDataSharingEnabled(!enabled);
    }
  }, [handleSettingsPatch]);

  const handleTaxUpdate = useCallback(async (newRate: number | null) => {
    const previous = incomeTaxRate;
    setIncomeTaxRate(newRate);
    try {
      await handleSettingsPatch({ incomeTaxRate: newRate });
    } catch {
      setIncomeTaxRate(previous);
    }
  }, [incomeTaxRate, handleSettingsPatch]);

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

    {/* Content — same layout when loading; cards show skeleton internally */}
    {/* Mobile: stacked */}
    <div className="md:hidden flex flex-col gap-4 px-4 pb-4">
      <PersonalInformationCard
        settings={userSettings}
        onEdit={handleEdit}
        onChange={handleChange}
        incomeTaxRate={incomeTaxRate}
        onTaxUpdate={handleTaxUpdate}
        languageOptions={languages}
        currencyOptions={currencies}
        userImageUrl={userImageUrl}
        loading={loading}
      />
      <LoginHistoryCard history={mockLoginHistory} loading={loading} />
      <SecurityDetailsCard
        settings={userSettings}
        onEdit={handleEdit}
        onChange={handleChange}
        onOpenAccountProfile={handleOpenAccountProfile}
        onDeleteAccount={handleDeleteAccountClick}
        loading={loading}
      />
      <FinancialMilestonesCard achievements={mockAchievements} loading={loading} />
      <DataSharingCard
        isEnabled={dataSharingEnabled}
        onToggle={handleDataSharingToggle}
        loading={loading}
      />
    </div>

    {/* Tablet: two-column split */}
    <div className="hidden md:grid 2xl:hidden md:grid-cols-[1fr_1fr] md:gap-4 md:px-6 md:pb-6">
      <div className="flex flex-col gap-4 min-h-0">
        <PersonalInformationCard
          settings={userSettings}
          onEdit={handleEdit}
          onChange={handleChange}
          incomeTaxRate={incomeTaxRate}
          onTaxUpdate={handleTaxUpdate}
          languageOptions={languages}
          currencyOptions={currencies}
          userImageUrl={userImageUrl}
          loading={loading}
        />
        <LoginHistoryCard history={mockLoginHistory} loading={loading} />
      </div>
      <div className="flex flex-col gap-4 min-h-0">
        <SecurityDetailsCard
          settings={userSettings}
          onEdit={handleEdit}
          onChange={handleChange}
          onOpenAccountProfile={handleOpenAccountProfile}
          onDeleteAccount={handleDeleteAccountClick}
          loading={loading}
        />
        <FinancialMilestonesCard achievements={mockAchievements} loading={loading} />
        <DataSharingCard
          isEnabled={dataSharingEnabled}
          onToggle={handleDataSharingToggle}
          loading={loading}
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
          incomeTaxRate={incomeTaxRate}
          onTaxUpdate={handleTaxUpdate}
          languageOptions={languages}
          currencyOptions={currencies}
          userImageUrl={userImageUrl}
          loading={loading}
        />
        <LoginHistoryCard history={mockLoginHistory} loading={loading} />
      </div>
      <div className="flex flex-col gap-4 min-h-0">
        <SecurityDetailsCard
          settings={userSettings}
          onEdit={handleEdit}
          onChange={handleChange}
          onOpenAccountProfile={handleOpenAccountProfile}
          onDeleteAccount={handleDeleteAccountClick}
          loading={loading}
        />
        <FinancialMilestonesCard achievements={mockAchievements} loading={loading} />
        <DataSharingCard
          isEnabled={dataSharingEnabled}
          onToggle={handleDataSharingToggle}
          loading={loading}
        />
      </div>
    </div>

    {/* Delete account confirmation modal */}
    {showDeleteModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget && !deleteInProgress) setShowDeleteModal(false);
        }}
        onKeyDown={(e) => e.key === 'Escape' && !deleteInProgress && setShowDeleteModal(false)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        <div
          className="max-w-2xl w-full max-h-[94vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-[var(--bg-surface)]"
          onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between p-6 border-b border-[#3a3a3a]">
              <h2 id="delete-account-title" className="text-card-header">Delete account</h2>
              <button
                type="button"
                onClick={() => !deleteInProgress && setShowDeleteModal(false)}
                className="rounded-full p-2 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--accent-purple)' }}
                aria-label="Close"
              >
                <span className="text-xl leading-none" aria-hidden>×</span>
              </button>
            </div>
            <div className="overflow-y-auto p-6 pb-8">
              <p className="text-body mb-6" style={{ color: 'var(--text-primary)' }}>
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => !deleteInProgress && setShowDeleteModal(false)}
                  className="px-6 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#282828', color: '#E7E4E4' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccountConfirm}
                  disabled={deleteInProgress}
                  className="flex items-center gap-2 px-6 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#D93F3F', color: '#E7E4E4' }}
                >
                  <Trash width={18} height={18} strokeWidth={1.5} />
                  {deleteInProgress ? 'Deleting…' : 'Delete account'}
                </button>
              </div>
            </div>
          </div>
      </div>
    )}
    </main>
  );
}



