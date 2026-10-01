'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';

type CurrencyOption = {
  id: number;
  name: string;
  symbol: string;
  alias: string;
};

type CurrenciesResponse = { currencies: CurrencyOption[]; rates: Record<number, number> };

/** All currencies plus conversion rates, cached for a day. */
export function useCurrencyOptions() {
  const authReady = useAuthReadyForApi();

  const query = useQuery({
    queryKey: queryKeys.currencies.withRates(),
    queryFn: fetchCurrencies,
    enabled: authReady,
    staleTime: 24 * 60 * 60 * 1000,
  });

  return {
    currencyOptions: query.data?.currencies ?? [],
    rates: query.data?.rates ?? {},
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}

async function fetchCurrencies(): Promise<CurrenciesResponse> {
  const data = await apiFetch<Partial<CurrenciesResponse>>(API.currencies, { params: { includeRates: true } });
  return {
    currencies: data.currencies ?? [],
    rates: data.rates ?? {},
  };
}
