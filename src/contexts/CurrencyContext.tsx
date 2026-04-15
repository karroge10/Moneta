'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { idbGet, idbSet } from '@/lib/idb';
import type { NotificationSettings } from '@/types/dashboard';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/notification-settings-constants';

interface Currency {
  id: number;
  name: string;
  symbol: string;
  alias: string;
}

/** Subset of GET /api/user/settings shared app-wide (one fetch via CurrencyProvider). */
export interface UserSettingsSnapshot {
  name: string | null;
  userName: string | null;
  email: string | null;
  dateOfBirth: string | null;
  country: string | null;
  profession: string | null;
  language: { id: number; name: string; alias: string } | null;
  currency: Currency | null;
  incomeTaxRate: number | null;
  dataSharingEnabled: boolean;
  notificationSettings: NotificationSettings;
  currencies: Array<{ id: number; name: string; symbol: string; alias: string }>;
}

interface CurrencyContextType {
  currency: Currency;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  userSettingsSnapshot: UserSettingsSnapshot | null;
  incomeTaxRate: number | null;
  notificationSettings: NotificationSettings;
}

const DEFAULT_CURRENCY: Currency = {
  id: 0,
  name: 'US Dollar',
  symbol: '$',
  alias: 'USD',
};

const CACHE_KEY_PREFIX = 'user-currency-';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function getCacheKey(userId: string | undefined): string | null {
  return userId ? `${CACHE_KEY_PREFIX}${userId}` : null;
}

type IdbUserCache = {
  currency: Currency;
  incomeTaxRate: number | null;
  dataSharingEnabled: boolean;
  notificationSettings: NotificationSettings;
  name: string | null;
  userName: string | null;
  email: string | null;
  dateOfBirth: string | null;
  country: string | null;
  profession: string | null;
  language: { id: number; name: string; alias: string } | null;
  currencies: Array<{ id: number; name: string; symbol: string; alias: string }>;
  timestamp: number;
};

type LegacyIdbUserCache = { currency: Currency; timestamp: number };

function isLegacyIdbShape(cached: unknown): cached is LegacyIdbUserCache {
  return (
    typeof cached === 'object' &&
    cached !== null &&
    'currency' in cached &&
    !('notificationSettings' in cached)
  );
}

function snapshotFromApi(data: {
  name?: string | null;
  userName?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  country?: string | null;
  profession?: string | null;
  language?: { id: number; name: string; alias: string } | null;
  currency?: { id: number; name: string; symbol: string; alias: string } | null;
  incomeTaxRate?: number | null;
  dataSharingEnabled?: boolean;
  notificationSettings?: NotificationSettings;
  currencies?: Array<{ id: number; name: string; symbol: string; alias: string }>;
}): UserSettingsSnapshot {
  const cur = data.currency
    ? {
        id: data.currency.id,
        name: data.currency.name,
        symbol: data.currency.symbol,
        alias: data.currency.alias,
      }
    : null;
  return {
    name: data.name ?? null,
    userName: data.userName ?? null,
    email: data.email ?? null,
    dateOfBirth: data.dateOfBirth ?? null,
    country: data.country ?? null,
    profession: data.profession ?? null,
    language: data.language ?? null,
    currency: cur,
    incomeTaxRate: data.incomeTaxRate ?? null,
    dataSharingEnabled: data.dataSharingEnabled ?? true,
    notificationSettings: data.notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS,
    currencies: data.currencies ?? [],
  };
}

function idbPayloadFromSnapshot(snapshot: UserSettingsSnapshot, timestamp: number): IdbUserCache {
  const c = snapshot.currency ?? DEFAULT_CURRENCY;
  return {
    currency: c,
    incomeTaxRate: snapshot.incomeTaxRate,
    dataSharingEnabled: snapshot.dataSharingEnabled,
    notificationSettings: snapshot.notificationSettings,
    name: snapshot.name,
    userName: snapshot.userName,
    email: snapshot.email,
    dateOfBirth: snapshot.dateOfBirth,
    country: snapshot.country,
    profession: snapshot.profession,
    language: snapshot.language,
    currencies: snapshot.currencies,
    timestamp,
  };
}

function snapshotFromIdb(cached: IdbUserCache): UserSettingsSnapshot {
  return {
    name: cached.name,
    userName: cached.userName,
    email: cached.email,
    dateOfBirth: cached.dateOfBirth,
    country: cached.country,
    profession: cached.profession,
    language: cached.language,
    currency: cached.currency,
    incomeTaxRate: cached.incomeTaxRate,
    dataSharingEnabled: cached.dataSharingEnabled,
    notificationSettings: cached.notificationSettings,
    currencies: cached.currencies,
  };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const userId = user?.id;

  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [userSettingsSnapshot, setUserSettingsSnapshot] = useState<UserSettingsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const applyFromSnapshot = useCallback((snapshot: UserSettingsSnapshot) => {
    setUserSettingsSnapshot(snapshot);
    setCurrency(snapshot.currency ?? DEFAULT_CURRENCY);
  }, []);

  const fetchCurrency = useCallback(
    async (background = false) => {
      const cacheKey = getCacheKey(userId ?? undefined);

      try {
        if (!background) {
          setLoading(true);
        }
        setError(null);
        const response = await fetch('/api/user/settings');

        if (response.status === 401) {
          setCurrency(DEFAULT_CURRENCY);
          setUserSettingsSnapshot(null);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const snapshot = snapshotFromApi(data);
          applyFromSnapshot(snapshot);
          if (cacheKey) {
            idbSet(cacheKey, idbPayloadFromSnapshot(snapshot, Date.now()));
          }
        } else {
          setCurrency(DEFAULT_CURRENCY);
          setUserSettingsSnapshot(null);
          setError(new Error('Failed to fetch currency settings'));
        }
      } catch (err) {
        const nextError = err instanceof Error ? err : new Error('Unknown error');
        setError(nextError);
        console.error('Error fetching currency:', nextError);
        setCurrency(DEFAULT_CURRENCY);
        setUserSettingsSnapshot(null);
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [userId, applyFromSnapshot]
  );

  useEffect(() => {
    let cancelled = false;
    const cacheKey = getCacheKey(userId ?? undefined);

    const hydrate = async () => {
      try {
        if (!cacheKey) {
          setCurrency(DEFAULT_CURRENCY);
          setUserSettingsSnapshot(null);
          setError(null);
          return;
        }

        const raw = await idbGet<LegacyIdbUserCache | IdbUserCache>(cacheKey);
        const legacy = raw !== null && isLegacyIdbShape(raw);
        const row = raw as LegacyIdbUserCache | IdbUserCache | null;

        if (row?.currency && !cancelled) {
          if (!legacy && 'notificationSettings' in row) {
            applyFromSnapshot(snapshotFromIdb(row));
          } else {
            setCurrency(row.currency);
            setUserSettingsSnapshot(null);
          }
          setError(null);
        }

        const stale =
          !row?.currency ||
          !row.timestamp ||
          legacy ||
          Date.now() - row.timestamp > CACHE_TTL_MS;

        if (!stale) {
          return;
        }
        if (!cancelled) {
          await fetchCurrency(Boolean(row?.currency));
        }
      } catch (err) {
        if (cancelled) return;
        const normalized = err instanceof Error ? err : new Error('Failed to fetch currency settings');
        setError(normalized);
        setCurrency(DEFAULT_CURRENCY);
        setUserSettingsSnapshot(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [userId, fetchCurrency, applyFromSnapshot]);

  const refetch = useCallback(() => fetchCurrency(false), [fetchCurrency]);

  const incomeTaxRate = userSettingsSnapshot?.incomeTaxRate ?? null;
  const notificationSettings =
    userSettingsSnapshot?.notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS;

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        loading,
        error,
        refetch,
        userSettingsSnapshot,
        incomeTaxRate,
        notificationSettings,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
