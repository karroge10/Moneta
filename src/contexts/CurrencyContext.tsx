'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

const CACHE_KEY = 'user-currency';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCurrency = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/user/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.currency) {
          setCurrency({
            id: data.currency.id,
            name: data.currency.name,
            symbol: data.currency.symbol,
            alias: data.currency.alias,
          });
          idbSet(CACHE_KEY, { currency: data.currency, timestamp: Date.now() });
        } else {
          setCurrency(DEFAULT_CURRENCY);
        }
      } else {
        throw new Error('Failed to fetch currency settings');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching currency:', error);
      // Fall back to default currency on error
      setCurrency(DEFAULT_CURRENCY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const cached = await idbGet<{ currency: Currency; timestamp: number }>(CACHE_KEY);
        const isStale = !cached || Date.now() - cached.timestamp > CACHE_TTL_MS;

        if (cached?.currency && !cancelled) {
          setCurrency(cached.currency);
          setError(null);
          if (!isStale) {
            setLoading(false);
            return;
          }
        }

        if (!cancelled) {
          await fetchCurrency();
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
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, loading, error, refetch: fetchCurrency }}>
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

