'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, WarningTriangle, RefreshDouble, Page, Trash } from 'iconoir-react';
import ProgressBar from '@/components/ui/ProgressBar';
import { APP_CONFIG } from '@/lib/config';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

interface Job {
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

interface RecentJobsListProps {
  onResumeJob: (jobId: string, status: JobStatus) => void;
  currentJobId?: string | null;
  className?: string;
  showTitle?: boolean;
  refreshTrigger?: number; // When this changes, trigger a refresh
  optimisticJob?: { // Optimistic job to add immediately
    id: string;
    fileName: string;
    status: JobStatus;
    createdAt: string;
  } | null;
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  return dateTimeFormatter.format(date);
}

function formatDuration(createdAt: string, completedAt: string | null): string | null {
  if (!completedAt) return null;
  
  const start = new Date(createdAt);
  const end = new Date(completedAt);
  
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  
  const totalSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  
  if (totalSeconds < 0) return null;
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
  }
  
  return parts.join(' ');
}

export default function RecentJobsList({
  onResumeJob,
  currentJobId,
  className = '',
  showTitle = true,
  refreshTrigger,
  optimisticJob,
}: RecentJobsListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const limit = showAll ? 50 : 20;
      const res = await fetch(`/api/jobs?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        const fetchedJobs = data.jobs || [];
        
        // Merge with optimistic job if it exists and isn't already in the list
        if (optimisticJob) {
          const hasOptimisticJob = fetchedJobs.some((j: Job) => j.id === optimisticJob.id);
          if (!hasOptimisticJob) {
            const optimisticJobEntry: Job = {
              id: optimisticJob.id,
              status: optimisticJob.status,
              progress: 0,
              fileName: optimisticJob.fileName,
              processedCount: null,
              totalCount: null,
              createdAt: optimisticJob.createdAt,
              completedAt: null,
              error: null,
            };
            // Add optimistic job at the top
            fetchedJobs.unshift(optimisticJobEntry);
          }
        }
        
        setJobs(fetchedJobs);
        // Set loading to false as soon as we have data (even if empty)
        setIsLoading(false);
      } else {
        // If request fails, still stop loading to avoid infinite spinner
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch recent jobs', error);
      // Stop loading even on error to avoid infinite spinner
      setIsLoading(false);
    }
  }, [optimisticJob, showAll]);

  const handleDelete = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation(); // Prevent triggering the onClick for resuming job
    
    if (!confirm('Are you sure you want to delete this import job? This action cannot be undone.')) {
      return;
    }

    setDeletingJobId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Remove the job from the list immediately
        setJobs(jobs.filter(job => job.id !== jobId));
      } else {
        const error = await res.json().catch(() => ({ error: 'Failed to delete job' }));
        alert(error.error || 'Failed to delete job');
      }
    } catch (error) {
      console.error('Failed to delete job', error);
      alert('Failed to delete job. Please try again.');
    } finally {
      setDeletingJobId(null);
    }
  };

  // Adaptive polling:
  // - If there are active jobs (queued/processing), poll frequently (5s)
  // - If all jobs are done, poll slowly (30s) to catch new uploads from other tabs/devices
  // - If no jobs exist yet, start with frequent polling then back off
  const activeJobsCount = jobs.filter(j => j.status === 'queued' || j.status === 'processing').length;
  const pollInterval = activeJobsCount > 0 
    ? APP_CONFIG.polling.recentJobs.activeInterval 
    : APP_CONFIG.polling.recentJobs.idleInterval;

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (currentJobId === undefined) return;
    fetchJobs();
  }, [currentJobId, fetchJobs]);

  // Refresh when refreshTrigger changes (used when job status changes)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchJobs();
    }
  }, [refreshTrigger, fetchJobs]);

  // Add optimistic job immediately when provided
  useEffect(() => {
    if (optimisticJob) {
      setJobs(prev => {
        // Check if job already exists (from fetch)
        const exists = prev.some(j => j.id === optimisticJob.id);
        if (exists) {
          // Update existing job
          return prev.map(j => j.id === optimisticJob.id ? {
            ...j,
            status: optimisticJob.status,
            fileName: optimisticJob.fileName,
          } : j);
        } else {
          // Add new optimistic job at the top
          const optimisticJobEntry: Job = {
            id: optimisticJob.id,
            status: optimisticJob.status,
            progress: 0,
            fileName: optimisticJob.fileName,
            processedCount: null,
            totalCount: null,
            createdAt: optimisticJob.createdAt,
            completedAt: null,
            error: null,
          };
          return [optimisticJobEntry, ...prev].slice(0, 5); // Keep only top 5
        }
      });
    }
  }, [optimisticJob]);

  useEffect(() => {
    if (APP_CONFIG.polling.recentJobs.temporarilyDisabled) {
      return;
    }
    const interval = setInterval(fetchJobs, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval, fetchJobs]);

  const showSkeleton = isLoading;
  const hasJobs = jobs.length > 0;

  return (
    <div className={`space-y-3 min-h-0 ${className}`}>
      {showTitle && <h3 className="text-sm font-semibold text-[#E7E4E4] px-1">Recent Imports</h3>}
      <div className="space-y-2">
        {showSkeleton && (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`job-skeleton-${index}`}
              className="rounded-2xl p-4 border border-[#3a3a3a] bg-[#282828] animate-pulse"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#343434]" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-[#343434] rounded w-3/5" />
                  <div className="h-3 bg-[#343434] rounded w-4/5" />
                  <div className="h-2 bg-[#343434] rounded w-full" />
                </div>
              </div>
            </div>
          ))
        )}

        {!showSkeleton && hasJobs && jobs.map((job) => {
          const isCurrent = job.id === currentJobId;
          const isCompleted = job.status === 'completed';
          const isFailed = job.status === 'failed';
          const isProcessing = job.status === 'processing' || job.status === 'queued';
          const completionDuration = isCompleted ? formatDuration(job.createdAt, job.completedAt) : null;

          return (
            <div
              key={job.id}
              onClick={() => !isCurrent && onResumeJob(job.id, job.status)}
              className={`
                rounded-2xl p-4 border transition-all
                ${isCurrent 
                  ? 'border-[#AC66DA] bg-[#2A2A2A] cursor-default' 
                  : 'border-[#3a3a3a] bg-[#282828] hover:border-[#555] hover:bg-[#2A2A2A] cursor-pointer active:scale-[0.98]'
                }
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${isCompleted ? 'bg-[rgba(116,198,72,0.1)] text-[#74C648]' : ''}
                    ${isFailed ? 'bg-[rgba(217,63,63,0.1)] text-[#D93F3F]' : ''}
                    ${isProcessing ? 'bg-[rgba(172,102,218,0.1)] text-[#AC66DA]' : ''}
                  `}>
                    {isCompleted && <CheckCircle width={20} height={20} strokeWidth={1.5} />}
                    {isFailed && <WarningTriangle width={20} height={20} strokeWidth={1.5} />}
                    {isProcessing && <RefreshDouble width={20} height={20} strokeWidth={1.5} className="animate-spin" />}
                  </div>
                  
                  <div className="flex-1 min-w-0 max-w-full">
                    <div className="flex items-center gap-2 mb-1 min-w-0">
                      <Page width={14} height={14} strokeWidth={1.5} className="text-[var(--text-secondary)] shrink-0" />
                      <p className="text-sm font-medium text-[#E7E4E4] truncate min-w-0 flex-1" title={job.fileName}>
                        {job.fileName}
                      </p>
                    </div>
                    
                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2 flex-wrap">
                      <span>{formatTimestamp(job.createdAt)}</span>
                      
                      {isProcessing && (
                        <>
                           <span>•</span>
                           <span>{job.status === 'queued' ? 'Queued' : `${job.progress}%`}</span>
                        </>
                      )}
                      
                      {isCompleted && job.processedCount && (
                        <>
                          <span>•</span>
                          <span>{job.processedCount} transactions</span>
                        </>
                      )}
                      
                      {isCompleted && completionDuration && (
                        <>
                          <span>•</span>
                          <span>{completionDuration}</span>
                        </>
                      )}
                    </div>

                    {isProcessing && (
                      <div className="mt-3">
                         <ProgressBar value={job.progress} height={4} showLabel={false} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isCurrent && (
                    <span className="text-xs font-medium text-[#AC66DA] bg-[rgba(172,102,218,0.1)] px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                  
                  <button
                    onClick={(e) => handleDelete(e, job.id)}
                    disabled={deletingJobId === job.id}
                    className={`
                      p-2 rounded-full transition-all
                      ${deletingJobId === job.id 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-[rgba(217,63,63,0.1)] hover:text-[#D93F3F] active:scale-95'
                      }
                      text-[var(--text-secondary)]
                    `}
                    title="Delete job"
                  >
                    <Trash 
                      width={16} 
                      height={16} 
                      strokeWidth={1.5}
                      className={deletingJobId === job.id ? 'animate-pulse' : ''}
                    />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!showSkeleton && !hasJobs && (
          <div className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#252525] p-6 text-center text-xs text-[var(--text-secondary)]">
            No imports yet. Start by uploading a PDF to see history here.
          </div>
        )}

        {!showSkeleton && hasJobs && jobs.length >= 20 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full rounded-xl border border-[#3a3a3a] bg-[#282828] px-4 py-3 text-sm font-medium transition-colors hover:border-[#AC66DA] hover:bg-[#2A2A2A] cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
          >
            View All Imports
          </button>
        )}
      </div>
    </div>
  );
}

