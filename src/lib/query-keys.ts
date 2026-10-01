/**
 * React Query key factory. Every query in the app takes its key from here so invalidation is
 * predictable: `queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })` refreshes every
 * transactions list regardless of filters, while `queryKeys.transactions.list(filters)` targets one.
 *
 * Conventions
 * - queryFn calls apiFetch from '@/lib/api-client' (throws ApiError, so 401/403/404 are not retried).
 * - Gate on Clerk with `enabled: authReady` (useAuthReadyForApi) for signed-in endpoints.
 * - Mutations invalidate the narrowest `.all` key that covers what they changed, plus `dashboard.all`
 *   when totals move.
 * - Keep data shaping in `select`, not in component state.
 *
 * Example hook:
 *
 *   export function useGoals() {
 *     const authReady = useAuthReadyForApi();
 *     return useQuery({
 *       queryKey: queryKeys.goals.list(),
 *       queryFn: () => apiFetch<{ goals: Goal[] }>(API.goals),
 *       select: (data) => data.goals,
 *       enabled: authReady,
 *     });
 *   }
 */

/** Filters accepted by list endpoints; undefined values are dropped by apiFetch params. */
export type QueryFilters = Record<string, string | number | boolean | null | undefined>;

/** Endpoint paths matching src/app/api. Functions build paths with ids. */
export const API = {
  dashboard: '/api/dashboard',
  transactions: '/api/transactions',
  expenses: '/api/expenses',
  income: '/api/income',
  statistics: '/api/statistics',
  financialHealth: '/api/financial-health',
  goals: '/api/goals',
  recurring: '/api/recurring',
  investments: '/api/investments',
  investment: (id: string | number) => `/api/investments/${id}`,
  investmentHistory: (id: string | number) => `/api/investments/${id}/history`,
  investmentPriceHistory: (id: string | number) => `/api/investments/${id}/price-history`,
  investmentsPerformance: '/api/investments/performance',
  investmentsSearch: '/api/investments/search',
  assets: '/api/assets',
  notifications: '/api/notifications',
  notificationRead: (id: string | number) => `/api/notifications/${id}/read`,
  jobs: '/api/jobs',
  job: (jobId: string) => `/api/jobs/${jobId}`,
  jobStatus: (jobId: string) => `/api/jobs/${jobId}/status`,
  categories: '/api/categories',
  currencies: '/api/currencies',
  exchangeRate: '/api/exchange-rate',
  userSettings: '/api/user/settings',
  loginHistory: '/api/user/login-history',
  billing: '/api/billing',
  learningProgress: '/api/learning-progress',
} as const;

export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    summary: (timePeriod: string) => ['dashboard', 'summary', timePeriod] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (filters: QueryFilters = {}) => ['transactions', 'list', filters] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    summary: (filters: QueryFilters = {}) => ['expenses', 'summary', filters] as const,
  },
  income: {
    all: ['income'] as const,
    summary: (filters: QueryFilters = {}) => ['income', 'summary', filters] as const,
  },
  statistics: {
    all: ['statistics'] as const,
    summary: (filters: QueryFilters = {}) => ['statistics', 'summary', filters] as const,
  },
  financialHealth: {
    all: ['financialHealth'] as const,
    detail: (timePeriod?: string) => ['financialHealth', 'detail', timePeriod ?? null] as const,
  },
  goals: {
    all: ['goals'] as const,
    list: () => ['goals', 'list'] as const,
  },
  recurring: {
    all: ['recurring'] as const,
    list: (filters: QueryFilters = {}) => ['recurring', 'list', filters] as const,
  },
  investments: {
    all: ['investments'] as const,
    list: () => ['investments', 'list'] as const,
    detail: (id: string | number) => ['investments', 'detail', String(id)] as const,
    history: (id: string | number) => ['investments', 'detail', String(id), 'history'] as const,
    priceHistory: (id: string | number, range?: string) =>
      ['investments', 'detail', String(id), 'priceHistory', range ?? null] as const,
    performance: (filters: QueryFilters = {}) => ['investments', 'performance', filters] as const,
  },
  assets: {
    all: ['assets'] as const,
    search: (query: string, filters: QueryFilters = {}) => ['assets', 'search', query, filters] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters: QueryFilters = {}) => ['notifications', 'list', filters] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    list: (filters: QueryFilters = {}) => ['jobs', 'list', filters] as const,
    detail: (jobId: string) => ['jobs', 'detail', jobId] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  currencies: {
    all: ['currencies'] as const,
    withRates: () => ['currencies', 'withRates'] as const,
  },
  userSettings: {
    all: ['userSettings'] as const,
  },
  billing: {
    all: ['billing'] as const,
  },
  learningProgress: {
    all: ['learningProgress'] as const,
  },
  loginHistory: {
    all: ['loginHistory'] as const,
    list: (filters: QueryFilters = {}) => ['loginHistory', 'list', filters] as const,
  },
} as const;
