'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import PersonalInformationCard from '@/components/settings/PersonalInformationCard';
import LoginHistoryCard from '@/components/settings/LoginHistoryCard';
import SecurityDetailsCard from '@/components/settings/SecurityDetailsCard';

import DataSharingCard from '@/components/settings/DataSharingCard';
import ExportDataCard from '@/components/settings/ExportDataCard';
import { ToastContainer, type ToastType } from '@/components/ui/Toast';
import { useCurrency } from '@/hooks/useCurrency';

import { UserSettings, LoginHistoryEntry } from '@/types/dashboard';
import { TimePeriod } from '@/types/dashboard';
import { Trash } from 'iconoir-react';

type CurrencyOption = { id: number; name: string; symbol: string; alias: string };

const emptySettings: UserSettings = {
  name: '',
  email: '',
  jobPosition: '',
  age: 0,
  country: '',
  currency: '',
  dateOfBirth: '',
  profession: '',
  incomeTaxRate: null,
};

function mapApiToUserSettings(data: {
  name?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  country?: string | null;
  profession?: string | null;
  language?: { id: number; name: string; alias: string } | null;
  currency?: { id: number; name: string; symbol: string; alias: string } | null;
  incomeTaxRate?: number | null;
}): UserSettings {
  return {
    ...emptySettings,
    name: data.name ?? '',
    email: data.email ?? '',
    country: data.country ?? '',
    profession: data.profession ?? '',
    currency: data.currency ? `${data.currency.symbol} ${data.currency.alias}` : '',
    dateOfBirth: data.dateOfBirth ?? '',
    incomeTaxRate: data.incomeTaxRate ?? null,
  };
}

export default function SettingsPage() {
  const authReady = useAuthReadyForApi();
  const router = useRouter();
  const { signOut, openUserProfile } = useClerk();
  const { user } = useUser();
  const { refetch: refetchCurrency, userSettingsSnapshot, loading: preferencesLoading } = useCurrency();
  const userImageUrl = user?.imageUrl ?? null;
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('All Time');
  const [userSettings, setUserSettings] = useState<UserSettings>(emptySettings);
  const [incomeTaxRate, setIncomeTaxRate] = useState<number | null>(null);
  const [dataSharingEnabled, setDataSharingEnabled] = useState(true);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const deleteModalOverlayRef = useRef<HTMLDivElement>(null);
  const deleteModalPointerDownOnOverlay = useRef(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: ToastType }>>([]);
  const taxUpdateIdRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const fetchLoginHistory = useCallback(async () => {
    setLoginHistoryLoading(true);
    try {
      const res = await fetch('/api/user/login-history');
      if (res.ok) {
        const data = await res.json();
        setLoginHistory(data.history ?? []);
      } else {
        setLoginHistory([]);
      }
    } catch {
      setLoginHistory([]);
    } finally {
      setLoginHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (userSettingsSnapshot) {
      setUserSettings(mapApiToUserSettings(userSettingsSnapshot));
      setIncomeTaxRate(userSettingsSnapshot.incomeTaxRate ?? null);
      setDataSharingEnabled(userSettingsSnapshot.dataSharingEnabled ?? true);
      setCurrencies(userSettingsSnapshot.currencies ?? []);
    } else if (!preferencesLoading) {
      setUserSettings(emptySettings);
      setIncomeTaxRate(null);
      setDataSharingEnabled(true);
      setCurrencies([]);
    }
  }, [authReady, userSettingsSnapshot, preferencesLoading]);

  useEffect(() => {
    if (!authReady) return;
    fetchLoginHistory();
  }, [authReady, fetchLoginHistory]);

  const handleSettingsPatch = useCallback(async (
    body: Record<string, unknown>,
    options?: { taxRequestId?: number }
  ) => {
    setSaving(true);
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
        const taxRequestId = options?.taxRequestId;
        const isLatestTax = taxRequestId === undefined || taxRequestId === taxUpdateIdRef.current;
        if (isLatestTax && data.settings.incomeTaxRate !== undefined) {
          setIncomeTaxRate(data.settings.incomeTaxRate ?? null);
        } else if (taxRequestId === undefined) {
          setIncomeTaxRate(data.settings.incomeTaxRate ?? null);
        }
        if (data.settings.dataSharingEnabled !== undefined) {
          setDataSharingEnabled(data.settings.dataSharingEnabled);
        }
        refetchCurrency();
      }
      addToast('Settings saved');
    } catch (err) {
      console.error('Settings update failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      addToast(message, 'error');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [addToast, refetchCurrency]);

  const handleChange = useCallback((field: string, value: string) => {
    setUserSettings((prev) => ({ ...prev, [field]: value }));
    const body: Record<string, unknown> = {};
    if (field === 'country') body.country = value;
    if (field === 'profession') body.profession = value || null;
    if (field === 'dateOfBirth') body.dateOfBirth = value || null;
    if (field === 'currency') {
      const curr = currencies.find((c) => `${c.symbol} ${c.alias}` === value);
      if (curr) body.currencyId = curr.id;
    }
    if (Object.keys(body).length > 0) {
      handleSettingsPatch(body).catch(() => {});
    }
  }, [currencies, handleSettingsPatch]);

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
    const id = ++taxUpdateIdRef.current;
    const previous = incomeTaxRate;
    setIncomeTaxRate(newRate);
    try {
      await handleSettingsPatch(
        { incomeTaxRate: newRate },
        { taxRequestId: id }
      );
    } catch {
      if (id === taxUpdateIdRef.current) {
        setIncomeTaxRate(previous);
      }
    }
  }, [incomeTaxRate, handleSettingsPatch]);

  return (
    <main className="min-h-screen bg-background pb-8">
      <div className="hidden md:block">
        <DashboardHeader pageName="Settings" />
      </div>

      <div className="md:hidden">
        <MobileNavbar
          pageName="Settings"
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          activeSection="settings"
        />
      </div>

      <div className="flex flex-col gap-4 px-4 md:px-6">
        {}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-[1.1fr_0.9fr] gap-4 items-stretch">
          <div className="flex flex-col h-full">
          <PersonalInformationCard
              settings={userSettings}
              onChange={handleChange}
              incomeTaxRate={incomeTaxRate}
              onTaxUpdate={handleTaxUpdate}
              currencyOptions={currencies}
              userImageUrl={userImageUrl}
              onOpenAccountProfile={handleOpenAccountProfile}
              loading={preferencesLoading}
              disabled={saving}
              className="h-full"
            />
          </div>

          <div className="flex flex-col gap-4 h-full">
            <SecurityDetailsCard
              settings={userSettings}
              onChange={handleChange}
              onOpenAccountProfile={handleOpenAccountProfile}
              onDeleteAccount={handleDeleteAccountClick}
              loading={preferencesLoading}
              disabled={saving}
            />
            <DataSharingCard
              isEnabled={dataSharingEnabled}
              onToggle={handleDataSharingToggle}
              loading={preferencesLoading}
              disabled={saving}
            />
            <div className="flex-1 flex flex-col">
              <ExportDataCard loading={preferencesLoading} />
            </div>
          </div>
        </div>

        {}
        <div className="w-full">
          <LoginHistoryCard history={loginHistory} loading={loginHistoryLoading} />
        </div>
      </div>

      <ToastContainer
        toasts={toasts}
        onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

    {}
    {showDeleteModal && (
      <>
        <div
          ref={deleteModalOverlayRef}
          className="fixed inset-0 z-50 bg-black/60 animate-in fade-in duration-200"
          onMouseDown={() => {
            deleteModalPointerDownOnOverlay.current = true;
          }}
          onMouseUp={() => {
            if (deleteModalPointerDownOnOverlay.current && deleteModalOverlayRef.current && !deleteInProgress) {
              setShowDeleteModal(false);
            }
            deleteModalPointerDownOnOverlay.current = false;
          }}
        />
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          onKeyDown={(e) => e.key === 'Escape' && !deleteInProgress && setShowDeleteModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div
            className="max-w-2xl w-full max-h-[94vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col bg-[var(--bg-surface)] pointer-events-auto"
            onMouseDown={() => {
              deleteModalPointerDownOnOverlay.current = false;
            }}
          >
            <div className="flex items-center justify-between p-6 border-b border-[#3a3a3a]">
              <h2 id="delete-account-title" className="text-card-header">Delete account</h2>
              <button
                type="button"
                onClick={() => !deleteInProgress && setShowDeleteModal(false)}
                className="rounded-full p-2 hover:opacity-80 transition-opacity cursor-pointer"
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
                  className="px-6 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90 cursor-pointer"
                  style={{ backgroundColor: '#282828', color: '#E7E4E4' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccountConfirm}
                  disabled={deleteInProgress}
                  className="flex items-center gap-2 px-6 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#D93F3F', color: '#E7E4E4' }}
                >
                  <Trash width={18} height={18} strokeWidth={1.5} />
                  {deleteInProgress ? 'Deleting…' : 'Delete account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )}
    </main>
  );
}



