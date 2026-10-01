'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import PersonalInformationCard from '@/components/settings/PersonalInformationCard';
import LoginHistoryCard from '@/components/settings/LoginHistoryCard';
import SecurityDetailsCard from '@/components/settings/SecurityDetailsCard';
import DataSharingCard from '@/components/settings/DataSharingCard';
import ExportDataCard from '@/components/settings/ExportDataCard';
import PlanCard from '@/components/settings/PlanCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/contexts/ToastContext';
import { useCurrency } from '@/hooks/useCurrency';
import type { UserSettingsSnapshot } from '@/contexts/CurrencyContext';
import { useDeleteAccount, useLoginHistory, useUpdateSettings, type SettingsPatch } from '@/components/settings/settingsQueries';
import type { UserSettings } from '@/types/dashboard';

type CurrencyOption = { id: number; name: string; symbol: string; alias: string };

/** Values shown before the server confirms a change, keyed like the UI fields. */
interface PendingValues {
  country?: string;
  profession?: string;
  dateOfBirth?: string;
  currency?: string;
  incomeTaxRate?: number | null;
  dataSharingEnabled?: boolean;
}

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

export default function SettingsPage() {
  const router = useRouter();
  const { signOut, openUserProfile } = useClerk();
  const { user } = useUser();
  const { addToast } = useToast();
  const { userSettingsSnapshot, loading: preferencesLoading } = useCurrency();
  const loginHistory = useLoginHistory();
  const updateSettings = useUpdateSettings();
  const deleteAccount = useDeleteAccount();
  const [pending, setPending] = useState<PendingValues>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const currencies: CurrencyOption[] = userSettingsSnapshot?.currencies ?? [];
  const savedSettings = toUserSettings(userSettingsSnapshot);
  const userSettings: UserSettings = {
    ...savedSettings,
    country: pending.country ?? savedSettings.country,
    profession: pending.profession ?? savedSettings.profession,
    dateOfBirth: pending.dateOfBirth ?? savedSettings.dateOfBirth,
    currency: pending.currency ?? savedSettings.currency,
  };
  const incomeTaxRate =
    pending.incomeTaxRate !== undefined ? pending.incomeTaxRate : (userSettingsSnapshot?.incomeTaxRate ?? null);
  const dataSharingEnabled = pending.dataSharingEnabled ?? userSettingsSnapshot?.dataSharingEnabled ?? true;
  const saving = updateSettings.isPending;

  /** Shows `values` right away, saves `patch`, and drops the pending values once the server answers. */
  const save = (values: PendingValues, patch: SettingsPatch) => {
    setPending((prev) => ({ ...prev, ...values }));
    updateSettings.mutate(patch, {
      onSuccess: () => addToast('Settings saved'),
      onError: (error) => addToast(error.message || 'Could not save settings', 'error'),
      onSettled: () => setPending((prev) => withoutSettled(prev, values)),
    });
  };

  const handleChange = (field: string, value: string) => {
    if (field === 'country') save({ country: value }, { country: value });
    if (field === 'profession') save({ profession: value }, { profession: value || null });
    if (field === 'dateOfBirth') save({ dateOfBirth: value }, { dateOfBirth: value || null });
    if (field === 'currency') {
      const currency = currencies.find((c) => currencyLabel(c) === value);
      if (currency) save({ currency: value }, { currencyId: currency.id });
    }
  };

  const handleTaxUpdate = (newRate: number | null) => {
    save({ incomeTaxRate: newRate }, { incomeTaxRate: newRate });
  };

  const handleDataSharingToggle = (enabled: boolean) => {
    save({ dataSharingEnabled: enabled }, { dataSharingEnabled: enabled });
  };

  const handleOpenAccountProfile = () => {
    openUserProfile?.();
  };

  const handleDeleteAccountConfirm = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: async () => {
        setShowDeleteModal(false);
        await signOut({ redirectUrl: '/' });
        router.push('/');
      },
      onError: (error) => addToast(error.message || 'Could not delete your account', 'error'),
    });
  };

  return (
    <main className="min-h-screen bg-background pb-8">
      <div className="hidden md:block">
        <DashboardHeader pageName="Settings" />
      </div>

      <div className="md:hidden">
        <MobileNavbar pageName="Settings" activeSection="settings" />
      </div>

      <div className="flex flex-col gap-4 px-4 md:px-6">
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 2xl:grid-cols-[1.1fr_0.9fr]">
          <div className="flex h-full flex-col">
            <PersonalInformationCard
              settings={userSettings}
              onChange={handleChange}
              incomeTaxRate={incomeTaxRate}
              onTaxUpdate={handleTaxUpdate}
              currencyOptions={currencies}
              userImageUrl={user?.imageUrl ?? null}
              onOpenAccountProfile={handleOpenAccountProfile}
              loading={preferencesLoading}
              disabled={saving}
              className="h-full"
            />
          </div>

          <div className="flex h-full flex-col gap-4">
            <SecurityDetailsCard
              settings={userSettings}
              onOpenAccountProfile={handleOpenAccountProfile}
              onDeleteAccount={() => setShowDeleteModal(true)}
              loading={preferencesLoading}
            />
            <DataSharingCard
              isEnabled={dataSharingEnabled}
              onToggle={handleDataSharingToggle}
              loading={preferencesLoading}
              disabled={saving}
            />
            <div className="flex flex-1 flex-col">
              <ExportDataCard loading={preferencesLoading} />
            </div>
          </div>
        </div>

        <PlanCard />

        <LoginHistoryCard
          history={loginHistory.data ?? []}
          loading={loginHistory.isPending}
          error={loginHistory.isError ? loginHistory.error.message : null}
          onRetry={() => loginHistory.refetch()}
          retrying={loginHistory.isFetching}
        />
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete your account?"
        variant="danger"
        confirmLabel="Delete account"
        cancelLabel="Keep account"
        isLoading={deleteAccount.isPending}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccountConfirm}
        message={
          <>
            <p>
              This permanently deletes your Moneta account and everything in it: transactions, goals, investments,
              recurring items, notifications and settings. It cannot be undone.
            </p>
            <p className="mt-3">If you want a copy of your transactions, use Export Data before you continue.</p>
            <p className="mt-3">
              If you are on Premium, the subscription is cancelled immediately and you will not be charged again.
            </p>
          </>
        }
      />
    </main>
  );
}

function currencyLabel(currency: { symbol: string; alias: string }): string {
  return `${currency.symbol} ${currency.alias}`;
}

function toUserSettings(snapshot: UserSettingsSnapshot | null): UserSettings {
  if (!snapshot) return emptySettings;
  return {
    ...emptySettings,
    name: snapshot.name ?? '',
    email: snapshot.email ?? '',
    country: snapshot.country ?? '',
    profession: snapshot.profession ?? '',
    currency: snapshot.currency ? currencyLabel(snapshot.currency) : '',
    dateOfBirth: snapshot.dateOfBirth ?? '',
    incomeTaxRate: snapshot.incomeTaxRate ?? null,
  };
}

/** Drops pending values that a finished save sent, unless a newer change has replaced them since. */
function withoutSettled(pending: PendingValues, settled: PendingValues): PendingValues {
  const next: PendingValues = { ...pending };
  for (const key of Object.keys(settled) as (keyof PendingValues)[]) {
    if (next[key] === settled[key]) delete next[key];
  }
  return next;
}
