'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch, isApiError } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import { useDebouncedValue } from '@/hooks/investments/useDebouncedValue';
import type { PerformanceDataPoint } from '@/types/dashboard';
import type {
  InvestmentHistoryApiRow,
  InvestmentSearchResultAsset,
  PriceHistoryPoint,
} from '@/types/investments';
import type { AssetDetail, InvestmentsSummary } from '@/hooks/investments/types';

/** Range the summary endpoint already covers (30 days of snapshots). */
export const DEFAULT_PERFORMANCE_RANGE = '1M';

/** Portfolio summary, holdings and recent activity for the investments page. */
export function useInvestmentsSummary() {
  const authReady = useAuthReadyForApi();
  return useQuery({
    queryKey: queryKeys.investments.list(),
    queryFn: () => apiFetch<InvestmentsSummary>(API.investments),
    enabled: authReady,
  });
}

/** Portfolio value series for a range. The default range is served by the summary, so it is not fetched. */
export function usePortfolioPerformance(range: string) {
  const authReady = useAuthReadyForApi();
  return useQuery({
    queryKey: queryKeys.investments.performance({ range }),
    queryFn: () => apiFetch<PerformanceDataPoint[]>(API.investmentsPerformance, { params: { range } }),
    enabled: authReady && range !== DEFAULT_PERFORMANCE_RANGE,
    placeholderData: keepPreviousData,
  });
}

/** One asset with stats and its transactions. */
export function useAssetDetail(assetId: string) {
  const authReady = useAuthReadyForApi();
  return useQuery({
    queryKey: queryKeys.investments.detail(assetId),
    queryFn: () => apiFetch<{ asset: AssetDetail }>(API.investment(assetId)),
    select: (data) => data.asset,
    enabled: authReady && Boolean(assetId),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** Price history of a live-priced asset for a range like '1M'. */
export function useAssetPriceHistory(assetId: string, range: string, enabled: boolean) {
  const authReady = useAuthReadyForApi();
  const historyKey = queryKeys.investments.history(assetId);
  return useQuery({
    queryKey: [...historyKey, range],
    queryFn: () => fetchPriceHistory(assetId, range),
    enabled: authReady && enabled,
    placeholderData: keepPreviousData,
  });
}

/** Crypto or stock search, debounced 300ms, only for queries of 2+ characters. */
export function useAssetSearch(query: string, assetType: string) {
  const authReady = useAuthReadyForApi();
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const searchable = debouncedQuery.length >= 2;
  const result = useQuery({
    queryKey: queryKeys.assets.search(debouncedQuery, { type: assetType }),
    queryFn: () => fetchSearch(debouncedQuery, assetType),
    enabled: authReady && searchable,
  });
  const waitingForDebounce = query.trim() !== debouncedQuery && query.trim().length >= 2;
  return {
    results: searchable ? (result.data ?? []) : [],
    loading: waitingForDebounce || (searchable && result.isFetching),
  };
}

interface ConversionRateArgs {
  fromCurrencyId: number | null | undefined;
  toCurrencyId: number | null | undefined;
  /** ISO date or YYYY-MM-DD; empty means today. */
  date: string;
  /** Today's rates already loaded by useCurrencyOptions, keyed by source currency id. */
  prefetchedRates: Record<number, number>;
}

/**
 * Rate from one currency to another on a date. Today's rate comes from `prefetchedRates` without a
 * request; other dates are fetched (debounced 500ms). `rate` is null when the currencies match or no
 * rate exists for that date.
 */
export function useConversionRate({ fromCurrencyId, toCurrencyId, date, prefetchedRates }: ConversionRateArgs) {
  const authReady = useAuthReadyForApi();
  const dateKey = toDateKey(date);
  const debouncedDateKey = useDebouncedValue(dateKey, 500);
  const needsRate = Boolean(fromCurrencyId && toCurrencyId && fromCurrencyId !== toCurrencyId);
  const isToday = dateKey === todayKey();
  const prefetched = isToday && fromCurrencyId ? prefetchedRates[fromCurrencyId] : undefined;
  const shouldFetch = needsRate && !prefetched;

  const query = useQuery({
    queryKey: [...queryKeys.currencies.all, 'rate', fromCurrencyId, toCurrencyId, debouncedDateKey],
    queryFn: () => fetchRate(fromCurrencyId as number, toCurrencyId as number, debouncedDateKey),
    enabled: authReady && shouldFetch,
    staleTime: 60 * 60 * 1000,
  });

  if (!needsRate) return { rate: null, loading: false };
  if (prefetched) return { rate: prefetched, loading: false };
  const settling = debouncedDateKey !== dateKey;
  return { rate: settling ? null : (query.data ?? null), loading: settling || query.isFetching };
}

async function fetchPriceHistory(assetId: string, range: string): Promise<PriceHistoryPoint[]> {
  const data = await apiFetch<{ history?: InvestmentHistoryApiRow[] }>(API.investmentHistory(assetId), {
    params: { range },
  });
  const history = data.history ?? [];
  return history.map((row) => ({ date: row.date, value: row.price }));
}

async function fetchSearch(query: string, assetType: string): Promise<InvestmentSearchResultAsset[]> {
  const data = await apiFetch<{ assets?: InvestmentSearchResultAsset[] }>(API.investmentsSearch, {
    params: { q: query, type: assetType },
  });
  return data.assets ?? [];
}

async function fetchRate(fromCurrencyId: number, toCurrencyId: number, date: string): Promise<number | null> {
  try {
    const data = await apiFetch<{ rate: number | null }>(API.exchangeRate, {
      params: { from: fromCurrencyId, to: toCurrencyId, date },
    });
    return data.rate ?? null;
  } catch (error) {
    if (isApiError(error, 404)) return null;
    throw error;
  }
}

function toDateKey(date: string): string {
  if (!date) return todayKey();
  return date.slice(0, 10);
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
