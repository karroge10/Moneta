'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, WarningTriangle, RefreshDouble, Page } from 'iconoir-react';
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

export default function RecentJobsList({ onResumeJob, currentJobId }: RecentJobsListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent jobs', error);
    } finally {
      setIsLoading(false);
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
    // Initial fetch
    fetchJobs();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchJobs, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  if (isLoading && jobs.length === 0) {
    return null;
  }

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mt-6">
      <h3 className="text-sm font-semibold text-[#E7E4E4] px-1">Recent Imports</h3>
      <div className="space-y-2">
        {jobs.map((job) => {
          const isCurrent = job.id === currentJobId;
          const isCompleted = job.status === 'completed';
          const isFailed = job.status === 'failed';
          const isProcessing = job.status === 'processing' || job.status === 'queued';

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
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Page width={14} height={14} strokeWidth={1.5} className="text-[var(--text-secondary)] shrink-0" />
                      <p className="text-sm font-medium text-[#E7E4E4] truncate" title={job.fileName}>
                        {job.fileName}
                      </p>
                    </div>
                    
                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
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
                    </div>

                    {isProcessing && (
                      <div className="mt-3">
                         <ProgressBar value={job.progress} height={4} showLabel={false} />
                      </div>
                    )}
                  </div>
                </div>

                {isCurrent && (
                  <span className="text-xs font-medium text-[#AC66DA] bg-[rgba(172,102,218,0.1)] px-2 py-1 rounded-full shrink-0">
                    Active
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

