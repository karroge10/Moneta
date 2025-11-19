'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, WarningTriangle, RefreshDouble, Page } from 'iconoir-react';
import ProgressBar from '@/components/ui/ProgressBar';

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

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
  onResumeJob: (jobId: string) => void;
  currentJobId?: string | null;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

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
              className={`
                rounded-2xl p-4 border transition-all
                ${isCurrent ? 'border-[#AC66DA] bg-[#2A2A2A]' : 'border-[#3a3a3a] bg-[#282828] hover:border-[#555]'}
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
                      <span>{formatTimeAgo(job.createdAt)}</span>
                      
                      {isProcessing && (
                        <>
                           <span>•</span>
                           <span>{job.status === 'queued' ? 'Queued' : `${job.progress}%`}</span>
                        </>
                      )}
                      
                      {isCompleted && job.processedCount && (
                        <>
                          <span>•</span>
                          <span>{job.processedCount} txns</span>
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

                {!isCurrent && (
                  <button
                    onClick={() => onResumeJob(job.id)}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer
                      ${isCompleted ? 'bg-[rgba(116,198,72,0.1)] text-[#74C648] hover:bg-[rgba(116,198,72,0.2)]' : ''}
                      ${isFailed ? 'bg-[rgba(217,63,63,0.1)] text-[#D93F3F] hover:bg-[rgba(217,63,63,0.2)]' : ''}
                      ${isProcessing ? 'bg-[rgba(172,102,218,0.1)] text-[#AC66DA] hover:bg-[rgba(172,102,218,0.2)]' : ''}
                    `}
                  >
                    {isCompleted ? 'View' : isFailed ? 'Retry' : 'Monitor'}
                  </button>
                )}
                {isCurrent && (
                  <span className="text-xs font-medium text-[#AC66DA] bg-[rgba(172,102,218,0.1)] px-2 py-1 rounded-full">
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

