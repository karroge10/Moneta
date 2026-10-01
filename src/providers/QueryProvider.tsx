'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { isApiError } from '@/lib/api-client';

/** App-wide React Query client. Defaults are tuned for per-user finance data; see shouldRetry. */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

const MAX_RETRIES = 2;

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data changes mostly through the user's own mutations, which invalidate keys explicitly.
        staleTime: 60 * 1000,
        // Refresh on return to the tab only once data is stale (React Query skips fresh queries).
        refetchOnWindowFocus: true,
        retry: shouldRetry,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/** Auth and missing-resource errors will not fix themselves, so only retry network and 5xx failures. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error, 400, 401, 403, 404, 409, 422)) return false;
  return failureCount < MAX_RETRIES;
}
