'use client';

import { useQuery } from '@tanstack/react-query';
import { type Category } from '@/types/dashboard';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';

/** Category list for the signed-in user, cached for a day. */
export function useCategories() {
  const authReady = useAuthReadyForApi();

  const query = useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: fetchCategories,
    enabled: authReady,
    staleTime: 24 * 60 * 60 * 1000,
  });

  return {
    categories: query.data ?? [],
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}

async function fetchCategories(): Promise<Category[]> {
  const data = await apiFetch<{ categories?: Category[] }>(API.categories);
  return data.categories ?? [];
}
