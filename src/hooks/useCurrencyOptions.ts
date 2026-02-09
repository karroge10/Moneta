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
let cachedRates: Record<number, number> | null = null;
let currenciesPromise: Promise<{ currencies: CurrencyOption[]; rates: Record<number, number> }> | null = null;
const CACHE_KEY = 'currency-options-cache';
const CACHE_RATES_KEY = 'currency-rates-cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function loadCurrencies(force = false): Promise<{ currencies: CurrencyOption[]; rates: Record<number, number> }> {
  if (!force && cachedCurrencies && cachedRates) return { currencies: cachedCurrencies, rates: cachedRates };
  if (!force && currenciesPromise) return currenciesPromise;

  currenciesPromise = (async () => {
    const response = await fetch('/api/currencies?includeRates=true');
    if (!response.ok) {
      throw new Error('Failed to fetch currencies');
    }
    const data = await response.json();
    const currencies = data.currencies || [];
    const rates = data.rates || {};
    cachedCurrencies = currencies;
    cachedRates = rates;

    // Fire and forget cache persistence
    idbSet(CACHE_KEY, { data: currencies, timestamp: Date.now() });
    idbSet(CACHE_RATES_KEY, { data: rates, timestamp: Date.now() });

    return { currencies, rates };
  })();

  try {
    return await currenciesPromise;
  } finally {
    currenciesPromise = null;
  }
}

export function useCurrencyOptions() {
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>(cachedCurrencies ?? []);
  const [rates, setRates] = useState<Record<number, number>>(cachedRates ?? {});
  const [loading, setLoading] = useState(!cachedCurrencies);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cachedCurrencies && cachedRates) return;
    let cancelled = false;

    const hydrate = async () => {
      setLoading(true);
      try {
        const cached = await idbGet<{ data: CurrencyOption[]; timestamp: number }>(CACHE_KEY);
        const cachedR = await idbGet<{ data: Record<number, number>; timestamp: number }>(CACHE_RATES_KEY);
        const isStale = !cached || Date.now() - cached.timestamp > CACHE_TTL_MS;

        if (cached?.data && cachedR?.data && !cancelled) {
          setCurrencyOptions(cached.data);
          setRates(cachedR.data);
          setError(null);
          if (!isStale) {
            setLoading(false);
            return;
          }
        }

        const fresh = await loadCurrencies(isStale);
        if (!cancelled) {
          setCurrencyOptions(fresh.currencies);
          setRates(fresh.rates);
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
    cachedRates = null;
    currenciesPromise = null;
    try {
      const data = await loadCurrencies(true);
      setCurrencyOptions(data.currencies);
      setRates(data.rates);
      return data.currencies;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error('Failed to fetch currencies');
      setError(normalized);
      throw normalized;
    } finally {
      setLoading(false);
    }
  }, []);

  return { currencyOptions, rates, loading, error, refetch };
}

