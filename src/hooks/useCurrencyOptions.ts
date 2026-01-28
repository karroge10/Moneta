'use client';

import { useCallback, useEffect, useState } from 'react';
import { idbGet, idbSet } from '@/lib/idb';

export type CurrencyOption = {
  id: number;
  name: string;
  symbol: string;
  alias: string;
};

let cachedCurrencies: CurrencyOption[] | null = null;
let currenciesPromise: Promise<CurrencyOption[]> | null = null;
const CACHE_KEY = 'currency-options-cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function loadCurrencies(force = false): Promise<CurrencyOption[]> {
  if (!force && cachedCurrencies) return cachedCurrencies;
  if (!force && currenciesPromise) return currenciesPromise;

  currenciesPromise = (async (): Promise<CurrencyOption[]> => {
    const response = await fetch('/api/currencies');
    if (!response.ok) {
      throw new Error('Failed to fetch currencies');
    }
    const data = await response.json();
    const currencies = data.currencies || [];
    cachedCurrencies = currencies;
    // Fire and forget cache persistence
    idbSet(CACHE_KEY, { data: currencies, timestamp: Date.now() });
    return currencies;
  })();

  try {
    return await currenciesPromise;
  } finally {
    currenciesPromise = null;
  }
}

export function useCurrencyOptions() {
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>(cachedCurrencies ?? []);
  const [loading, setLoading] = useState(!cachedCurrencies);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cachedCurrencies) return;
    let cancelled = false;

    const hydrate = async () => {
      setLoading(true);
      try {
        const cached = await idbGet<{ data: CurrencyOption[]; timestamp: number }>(CACHE_KEY);
        const isStale = !cached || Date.now() - cached.timestamp > CACHE_TTL_MS;

        if (cached?.data && !cancelled) {
          setCurrencyOptions(cached.data);
          setError(null);
          if (!isStale) {
            setLoading(false);
            return;
          }
        }

        const fresh = await loadCurrencies(isStale);
        if (!cancelled) {
          setCurrencyOptions(fresh);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        const normalized = err instanceof Error ? err : new Error('Failed to fetch currencies');
        setError(normalized);
        console.error('Error fetching currencies:', normalized);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    cachedCurrencies = null;
    currenciesPromise = null;
    try {
      const opts = await loadCurrencies(true);
      setCurrencyOptions(opts);
      return opts;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error('Failed to fetch currencies');
      setError(normalized);
      throw normalized;
    } finally {
      setLoading(false);
    }
  }, []);

  return { currencyOptions, loading, error, refetch };
}

