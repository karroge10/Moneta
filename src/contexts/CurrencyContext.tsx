'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { idbGet, idbSet } from '@/lib/idb';

interface Currency {
  id: number;
  name: string;
  symbol: string;
  alias: string;
}

interface CurrencyContextType {
  currency: Currency;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
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

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const userId = user?.id;

  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.currency) {
            const next = {
              id: data.currency.id,
              name: data.currency.name,
              symbol: data.currency.symbol,
              alias: data.currency.alias,
            };
            setCurrency(next);
            if (cacheKey) {
              idbSet(cacheKey, { currency: next, timestamp: Date.now() });
            }
          } else {
            setCurrency(DEFAULT_CURRENCY);
          }
        } else {
          setCurrency(DEFAULT_CURRENCY);
          setError(new Error('Failed to fetch currency settings'));
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error fetching currency:', error);
        setCurrency(DEFAULT_CURRENCY);
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    let cancelled = false;
    const cacheKey = getCacheKey(userId ?? undefined);

    const hydrate = async () => {
      try {
        if (cacheKey) {
          const cached = await idbGet<{ currency: Currency; timestamp: number }>(cacheKey);
          if (cached?.currency && !cancelled) {
            setCurrency(cached.currency);
            setError(null);
          }
          if (!cancelled) {
            await fetchCurrency(true);
          }
        } else {
          setCurrency(DEFAULT_CURRENCY);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        const normalized = err instanceof Error ? err : new Error('Failed to fetch currency settings');
        setError(normalized);
        setCurrency(DEFAULT_CURRENCY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [userId, fetchCurrency]);

  const refetch = useCallback(() => fetchCurrency(false), [fetchCurrency]);

  return (
    <CurrencyContext.Provider value={{ currency, loading, error, refetch }}>
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

