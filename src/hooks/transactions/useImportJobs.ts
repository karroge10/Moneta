'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { APP_CONFIG } from '@/lib/config';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ImportJob {
  id: string;
  status: JobStatus;
  progress: number;
  fileName: string;
  processedCount: number | null;
  totalCount: number | null;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

interface JobsResponse {
  jobs: ImportJob[];
}

/** Prefix of every job list query; status polling lives under jobs.detail and is not touched. */
export const JOB_LISTS_KEY = [...queryKeys.jobs.all, 'list'] as const;

export const RECENT_JOBS_LIMIT = 20;
const ALL_JOBS_LIMIT = 50;

/**
 * Recent PDF import jobs. Polls every 5s while any job is queued or processing, every 30s otherwise
 * (APP_CONFIG.polling.recentJobs).
 */
export function useImportJobs(showAll: boolean) {
  const authReady = useAuthReadyForApi();
  const limit = showAll ? ALL_JOBS_LIMIT : RECENT_JOBS_LIMIT;
  const { activeInterval, idleInterval, temporarilyDisabled } = APP_CONFIG.polling.recentJobs;

  return useQuery({
    queryKey: queryKeys.jobs.list({ limit }),
    queryFn: () => apiFetch<JobsResponse>(API.jobs, { params: { limit } }),
    select: (data) => data.jobs ?? [],
    enabled: authReady,
    refetchInterval: (query) => {
      if (temporarilyDisabled) return false;
      const jobs = query.state.data?.jobs ?? [];
      return jobs.some(isActiveJob) ? activeInterval : idleInterval;
    },
  });
}

/** Deletes an import job and refreshes the job list. */
export function useDeleteImportJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => apiFetch<{ success: true }>(API.job(jobId), { method: 'DELETE' }),
    onSuccess: (_data, jobId) => {
      queryClient.setQueriesData<JobsResponse>({ queryKey: JOB_LISTS_KEY }, (data) =>
        data ? { jobs: data.jobs.filter((job) => job.id !== jobId) } : data,
      );
      return queryClient.invalidateQueries({ queryKey: JOB_LISTS_KEY });
    },
  });
}

/** Shows a just-uploaded job at the top of every cached job list before the server lists it. */
export function addOptimisticJob(
  queryClient: QueryClient,
  job: Pick<ImportJob, 'id' | 'fileName' | 'status' | 'createdAt'>,
) {
  const entry: ImportJob = {
    ...job,
    progress: 0,
    processedCount: null,
    totalCount: null,
    completedAt: null,
    error: null,
  };
  queryClient.setQueriesData<JobsResponse>({ queryKey: JOB_LISTS_KEY }, (data) => {
    if (!data || data.jobs.some((existing) => existing.id === job.id)) return data;
    return { jobs: [entry, ...data.jobs] };
  });
  return queryClient.invalidateQueries({ queryKey: JOB_LISTS_KEY });
}

function isActiveJob(job: Pick<ImportJob, 'status'>): boolean {
  return job.status === 'queued' || job.status === 'processing';
}
