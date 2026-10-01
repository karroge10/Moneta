'use client';

import { useState } from 'react';
import { CheckCircle, WarningTriangle, RefreshDouble, Page, Trash } from 'iconoir-react';
import ProgressBar from '@/components/ui/ProgressBar';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { cx } from '@/components/ui/cx';
import {
  RECENT_JOBS_LIMIT,
  useDeleteImportJob,
  useImportJobs,
  type ImportJob,
  type JobStatus,
} from '@/hooks/transactions/useImportJobs';
import { formatDecimal } from '@/lib/format';

export type { JobStatus };

interface RecentJobsListProps {
  onResumeJob: (jobId: string, status: JobStatus) => void;
  currentJobId?: string | null;
  className?: string;
  /** Called after the job that is open in the review table was deleted. */
  onDeleteActiveJob?: () => void;
  onError?: (message: string) => void;
}

/** Recent PDF imports with status, progress and delete. Selecting a job loads it into the review table. */
export default function RecentJobsList({
  onResumeJob,
  currentJobId,
  className,
  onDeleteActiveJob,
  onError,
}: RecentJobsListProps) {
  const [showAll, setShowAll] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ImportJob | null>(null);
  const jobsQuery = useImportJobs(showAll);
  const deleteJob = useDeleteImportJob();
  const jobs = jobsQuery.data ?? [];

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const jobId = pendingDelete.id;
    try {
      await deleteJob.mutateAsync(jobId);
      if (jobId === currentJobId) onDeleteActiveJob?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete job. Please try again.';
      onError?.(message);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className={cx('min-h-0 space-y-2', className)}>
      <JobsBody
        jobs={jobs}
        isLoading={jobsQuery.isPending}
        error={jobsQuery.error}
        onRetry={() => jobsQuery.refetch()}
        retrying={jobsQuery.isFetching}
        currentJobId={currentJobId ?? null}
        deletingJobId={deleteJob.isPending ? (deleteJob.variables ?? null) : null}
        onResumeJob={onResumeJob}
        onDelete={setPendingDelete}
      />

      {jobs.length >= RECENT_JOBS_LIMIT && !showAll && (
        <Button variant="secondary" fullWidth onClick={() => setShowAll(true)}>
          View All Imports
        </Button>
      )}

      <ConfirmModal
        isOpen={pendingDelete !== null}
        title="Delete import"
        message="Are you sure you want to delete this import job? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        isLoading={deleteJob.isPending}
        variant="danger"
      />
    </div>
  );
}

interface JobsBodyProps {
  jobs: ImportJob[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  retrying: boolean;
  currentJobId: string | null;
  deletingJobId: string | null;
  onResumeJob: RecentJobsListProps['onResumeJob'];
  onDelete: (job: ImportJob) => void;
}

function JobsBody({
  jobs,
  isLoading,
  error,
  onRetry,
  retrying,
  currentJobId,
  deletingJobId,
  onResumeJob,
  onDelete,
}: JobsBodyProps) {
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 3 }, (_, index) => (
          <JobSkeleton key={`job-skeleton-${index}`} />
        ))}
      </div>
    );
  }
  if (error && jobs.length === 0) return <ErrorState message={error.message} onRetry={onRetry} retrying={retrying} />;
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={<Page width={24} height={24} strokeWidth={1.5} />}
        title="No imports yet"
        description="Start by uploading a PDF to see history here."
        className="rounded-panel border border-dashed border-line"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {jobs.map((job) => (
        <li key={job.id}>
          <JobItem
            job={job}
            isCurrent={job.id === currentJobId}
            isDeleting={deletingJobId === job.id}
            onResume={() => onResumeJob(job.id, job.status)}
            onDelete={() => onDelete(job)}
          />
        </li>
      ))}
    </ul>
  );
}

interface JobItemProps {
  job: ImportJob;
  isCurrent: boolean;
  isDeleting: boolean;
  onResume: () => void;
  onDelete: () => void;
}

function JobItem({ job, isCurrent, isDeleting, onResume, onDelete }: JobItemProps) {
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const isProcessing = job.status === 'processing' || job.status === 'queued';
  const duration = isCompleted ? formatJobDuration(job.createdAt, job.completedAt) : null;

  return (
    <div
      className={cx(
        'relative rounded-panel border p-4 transition-colors',
        isCurrent ? 'border-accent bg-surface-2' : 'border-line bg-surface-1 hover:border-line-strong hover:bg-surface-2',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onResume}
          disabled={isCurrent}
          aria-current={isCurrent || undefined}
          className="flex min-w-0 flex-1 items-start gap-3 text-left cursor-pointer disabled:cursor-default focus-visible:outline-2 focus-visible:outline-accent"
        >
          <JobStatusIcon status={job.status} />
          <span className="min-w-0 max-w-full flex-1">
            <span className="mb-1 flex min-w-0 items-center gap-2">
              <Page width={14} height={14} strokeWidth={1.5} className="shrink-0 text-secondary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-ui font-medium text-fg" title={job.fileName}>
                {job.fileName}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-2 text-caption text-secondary tabular-nums">
              <span>{formatTimestamp(job.createdAt)}</span>
              {isProcessing && <Meta>{job.status === 'queued' ? 'Queued' : `${job.progress}%`}</Meta>}
              {isFailed && <Meta>Failed</Meta>}
              {isCompleted && job.processedCount ? <Meta>{formatDecimal(job.processedCount)} transactions</Meta> : null}
              {duration && <Meta>{duration}</Meta>}
            </span>
            {isProcessing && (
              <span className="mt-3 block">
                <ProgressBar value={job.progress} height={4} showLabel={false} />
              </span>
            )}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {isCurrent && (
            <span className="rounded-full bg-accent/10 px-2 py-1 text-caption font-medium text-accent-fg">Active</span>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            aria-label={`Delete import ${job.fileName}`}
            title="Delete job"
            className="inline-flex size-10 items-center justify-center rounded-full text-secondary transition-colors hover:bg-negative/10 hover:text-negative-fg disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
          >
            <Trash width={16} height={16} strokeWidth={1.5} className={cx(isDeleting && 'animate-pulse')} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function JobStatusIcon({ status }: { status: JobStatus }) {
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex size-10 shrink-0 items-center justify-center rounded-full',
        isCompleted && 'bg-positive/10 text-positive',
        isFailed && 'bg-negative/10 text-negative-fg',
        !isCompleted && !isFailed && 'bg-accent/10 text-accent-fg',
      )}
    >
      {isCompleted && <CheckCircle width={20} height={20} strokeWidth={1.5} />}
      {isFailed && <WarningTriangle width={20} height={20} strokeWidth={1.5} />}
      {!isCompleted && !isFailed && <RefreshDouble width={20} height={20} strokeWidth={1.5} className="animate-spin" />}
    </span>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <>
      <span aria-hidden="true">•</span>
      <span>{children}</span>
    </>
  );
}

function JobSkeleton() {
  return (
    <div className="rounded-panel border border-line bg-surface-1 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
    </div>
  );
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return dateTimeFormatter.format(date);
}

function formatJobDuration(createdAt: string, completedAt: string | null): string | null {
  if (!completedAt) return null;
  const start = new Date(createdAt).getTime();
  const end = new Date(completedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const totalSeconds = Math.floor((end - start) / 1000);
  if (totalSeconds < 0) return null;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(plural(hours, 'hour'));
  if (minutes > 0) parts.push(plural(minutes, 'minute'));
  if (seconds > 0 || parts.length === 0) parts.push(plural(seconds, 'second'));
  return parts.join(' ');
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count !== 1 ? 's' : ''}`;
}
