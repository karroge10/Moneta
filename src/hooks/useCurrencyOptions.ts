'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';

export type CurrencyOption = {
  id: number;
  name: string;
  symbol: string;
  alias: string;
};

async function fetchCurrencies(): Promise<{ currencies: CurrencyOption[]; rates: Record<number, number> }> {
  const response = await fetch('/api/currencies?includeRates=true');
  if (!response.ok) {
    throw new Error('Failed to fetch currencies');
  }
  const data = await response.json();
  return {
    currencies: data.currencies || [],
    rates: data.rates || {},
  };
}

export function useCurrencyOptions() {
  const { isLoaded, isSignedIn } = useAuth();
  const authReady = !!(isLoaded && isSignedIn);

  const query = useQuery({
    queryKey: ['currencies'],
    queryFn: fetchCurrencies,
    enabled: authReady,
    staleTime: 24 * 60 * 60 * 1000, // 24h caching
  });

  return {
    currencyOptions: query.data?.currencies ?? [],
    rates: query.data?.rates ?? {},
    loading: query.isPending,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
