'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import SearchBar from '@/components/transactions/shared/SearchBar';
import CategoryFilter from '@/components/transactions/shared/CategoryFilter';
import CategoryPicker from '@/components/transactions/shared/CategoryPicker';
import TypeFilter from '@/components/transactions/shared/TypeFilter';
import CategoryStatsModal from '@/components/transactions/CategoryStatsModal';
import RecentJobsList, { type JobStatus } from '@/components/transactions/import/RecentJobsList';
import { TransactionUploadResponse, UploadedTransaction, type Category } from '@/types/dashboard';
import { CheckCircle, Upload, WarningTriangle, Reports, Language, Trash } from 'iconoir-react';
import { useCurrency } from '@/hooks/useCurrency';

type UploadState = 'idle' | 'queued' | 'uploading' | 'processing' | 'categorizing' | 'ready' | 'error';

type TableRow = UploadedTransaction & {
  id: string;
  suggestedCategory?: string | null;
};

const REVIEW_PAGE_SIZE = 12;

export default function ImportTransactionsPage() {
  const { currency } = useCurrency();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progressValue, setProgressValue] = useState(0);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<TableRow[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPageInput, setReviewPageInput] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>(''); // 'expense' | 'income' | ''
  const [categories, setCategories] = useState<Category[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCategoryStatsOpen, setIsCategoryStatsOpen] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalTimeSeconds, setTotalTimeSeconds] = useState<number | null>(null);
  const [processedCount, setProcessedCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentProgressRef = useRef<number>(0);

  const filteredRows = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase();
    return parsedRows.filter(row => {
      const matchesQuery =
        !query ||
        row.description.toLowerCase().includes(query) ||
        row.translatedDescription.toLowerCase().includes(query) ||
        row.category?.toLowerCase().includes(query) ||
        row.date.toLowerCase().includes(query);
      const matchesCategory = !categoryFilter || 
        (categoryFilter === '__uncategorized__' ? row.category === null : row.category === categoryFilter);
      const matchesType = !typeFilter || 
        (typeFilter === 'expense' && row.amount < 0) ||
        (typeFilter === 'income' && row.amount >= 0);
      return matchesQuery && matchesCategory && matchesType;
    });
  }, [parsedRows, debouncedSearchQuery, categoryFilter, typeFilter]);


  useEffect(() => {
    setReviewPage(1);
    setReviewPageInput('1');
  }, [filteredRows.length]);

  const reviewTotalPages = filteredRows.length
    ? Math.ceil(filteredRows.length / REVIEW_PAGE_SIZE)
    : 1;

  useEffect(() => {
    if (reviewPage > reviewTotalPages) {
      setReviewPage(reviewTotalPages);
      setReviewPageInput(reviewTotalPages.toString());
    }
  }, [reviewPage, reviewTotalPages]);

  useEffect(() => {
    setReviewPageInput(reviewPage.toString());
  }, [reviewPage]);

  const handleReviewPageInputChange = (value: string) => {
    setReviewPageInput(value);
  };

  const handleReviewPageInputSubmit = () => {
    const page = parseInt(reviewPageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= reviewTotalPages) {
      setReviewPage(page);
    } else {
      setReviewPageInput(reviewPage.toString());
    }
  };

  const paginatedReviewRows = useMemo(() => {
    const start = (reviewPage - 1) * REVIEW_PAGE_SIZE;
    return filteredRows.slice(start, start + REVIEW_PAGE_SIZE);
  }, [filteredRows, reviewPage]);


  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const categoryLookup = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach(category => {
      map.set(category.name, category);
    });
    return map;
  }, [categories]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const resetUploadState = () => {
    setUploadState('idle');
    setProgressValue(0);
    setStatusNote(null);
    setStartTime(null);
    setElapsedSeconds(0);
    setTotalTimeSeconds(null);
    setProcessedCount(null);
    setTotalCount(null);
    setCurrentJobId(null);
    currentProgressRef.current = 0;
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Format time in seconds to human-readable string
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  // Start timer interval
  useEffect(() => {
    if (uploadState !== 'idle' && startTime !== null) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [uploadState, startTime]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Helper to start polling for status
  const startPolling = useCallback((jobId: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    
    const poll = async () => {
      try {
        const res = await fetch(`/api/transactions/upload-bank-statement/${jobId}/status`);
        if (!res.ok) {
           // If 404 or 500, maybe stop? For now just retry next tick
           return;
        }
        const data = await res.json();
        
        if (data.status === 'failed') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setUploadState('error');
          setStatusNote(data.error || 'Processing failed');
          return;
        }
        
        if (data.status === 'completed') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          
          // Process results similar to original flow
          const result = data.result as TransactionUploadResponse;
          
          if (!result || !result.transactions || result.transactions.length === 0) {
            setUploadState('error');
            setStatusNote('No transactions were detected in that PDF.');
            return;
          }
          
          // Normalize transactions
          const normalized: TableRow[] = result.transactions.map(item => ({
            id: crypto.randomUUID(),
            date: item.date,
            description: item.description,
            translatedDescription: item.translatedDescription,
            amount: item.amount,
            category: item.category && item.category.toLowerCase() !== 'currency exchange' ? item.category : null,
            confidence: item.confidence,
            suggestedCategory: item.category && item.category.toLowerCase() !== 'currency exchange' ? item.category : null,
          }));
          
          // Only set total time if we had a valid start time, otherwise use 0 or don't show it
          // For resumed jobs, startTime might be the resumption time, not original start
          const totalTime = startTime 
            ? Math.floor((Date.now() - startTime) / 1000)
            : 0;
            
          setTotalTimeSeconds(totalTime);
          setElapsedSeconds(totalTime); // freeze elapsed
          
          setParsedRows(normalized);
          setUploadState('ready');
          setProgressValue(100);
          setStatusNote(`${normalized.length} transactions parsed successfully.`);
          return;
        }
        
        // Still processing/queued
        if (typeof data.progress === 'number') {
          setProgressValue(Math.max(5, data.progress));
        }
        
        // Update transaction counts if available
        if (typeof data.processedCount === 'number') {
          setProcessedCount(data.processedCount);
        }
        if (typeof data.totalCount === 'number') {
          setTotalCount(data.totalCount);
        }
        
        if (data.status === 'queued') {
           if (data.queuePosition > 0) {
             setStatusNote(`Queued: ${data.queuePosition} users ahead of you.`);
           } else {
             setStatusNote('Queued: Waiting for worker...');
           }
           setUploadState('queued');
        } else if (data.status === 'processing') {
          // Show transaction count if available
          if (data.processedCount !== null && data.totalCount !== null) {
            setStatusNote(`Processing transaction ${data.processedCount} of ${data.totalCount}...`);
          } else {
            setStatusNote('Processing PDF...');
          }
          setUploadState('processing');
        }
        
      } catch (err) {
        console.error('Polling error:', err);
      }
    };
    
    // Poll every 1.5 seconds
    pollingIntervalRef.current = setInterval(poll, 1500);
    poll(); // initial call
  }, [startTime]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        setUploadState('error');
        setStatusNote('Only PDF files are supported right now.');
        return;
      }

      // Reset and start timer
      const now = Date.now();
      setStartTime(now);
      setElapsedSeconds(0);
      setTotalTimeSeconds(null);
      setProgressValue(0);
      setProcessedCount(null);
      setTotalCount(null);

      // Clear any existing intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      setUploadState('queued');
      setStatusNote(`Preparing to upload "${file.name}"`);
      setProgressValue(5);

      const formData = new FormData();
      formData.append('file', file);

      try {
        // Upload phase - show immediately
        setUploadState('uploading');
        setProgressValue(10);
        setStatusNote(`Uploading "${file.name}"...`);

        const response = await fetch('/api/transactions/upload-bank-statement', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
          setUploadState('error');
          setProgressValue(0);
          setStatusNote(errorData.error || `Upload failed with status ${response.status}`);
          setStartTime(null);
          setElapsedSeconds(0);
          return;
        }

        // New Async Flow: Get Job ID and start polling
        const result = await response.json() as { 
          jobId: string;
          status: string;
          queuePosition?: number;
          message?: string;
        };
        
        if (!result.jobId) {
             throw new Error('No job ID received from server');
        }
        
        setCurrentJobId(result.jobId);

        // Start polling with the returned Job ID
        startPolling(result.jobId);
        
        // Show queue info if available (this is the initial queue position when request started)
        // Note: This shows AFTER processing completes, but it's informational
        if (result.queuePosition !== undefined) {
          if (result.queuePosition > 0) {
            setStatusNote(`Queued: ${result.queuePosition} users ahead in queue`);
            setUploadState('queued');
          } else {
            setStatusNote('Processing PDF... (No queue - processing immediately)');
            setUploadState('processing');
          }
        }

      } catch (error) {
        console.error('[import/upload]', error);
        setUploadState('error');
        setProgressValue(0);
        setStatusNote('We could not upload that PDF. Double-check the file and try again.');
        setStartTime(null);
        setElapsedSeconds(0);
      } finally {
        // Clean up
      }
    },
    [startPolling],
  );

  const handleResumeJob = useCallback((jobId: string, jobStatus: JobStatus) => {
    // Reset relevant state
    setParsedRows([]);
    setProgressValue(0);
    setTotalTimeSeconds(null);
    setProcessedCount(null);
    setTotalCount(null);
    
    const isCompletedJob = jobStatus === 'completed';
    
    if (!isCompletedJob) {
      // For resuming, we don't have exact start time, so we start timer from now for feedback
      const now = Date.now();
      setStartTime(now);
      setElapsedSeconds(0);
    } else {
      setStartTime(null);
      setElapsedSeconds(0);
    }
    
    setCurrentJobId(jobId);
    if (!isCompletedJob) {
      setUploadState('queued'); // Will be updated by first poll
      setStatusNote('Resuming job...');
    } else {
      setUploadState('idle');
      setStatusNote(null);
    }
    
    // Clear existing intervals
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    // Start polling immediately
    startPolling(jobId);
  }, [startPolling]);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer?.files?.[0]) {
        handleFileUpload(event.dataTransfer.files[0]);
      }
    },
    [handleFileUpload],
  );

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const preventDefaults = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    dropZone.addEventListener('dragenter', preventDefaults);
    dropZone.addEventListener('dragover', preventDefaults);
    dropZone.addEventListener('dragleave', preventDefaults);
    dropZone.addEventListener('drop', handleDrop as EventListener);

    return () => {
      dropZone.removeEventListener('dragenter', preventDefaults);
      dropZone.removeEventListener('dragover', preventDefaults);
      dropZone.removeEventListener('dragleave', preventDefaults);
      dropZone.removeEventListener('drop', handleDrop as EventListener);
    };
  }, [handleDrop]);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    event.target.value = '';
  };

  const handleRowUpdate = async (id: string, key: keyof UploadedTransaction, value: string) => {
    setParsedRows(prev =>
      prev.map(row => {
        if (row.id !== id) return row;

        if (key === 'amount') {
          const sanitized = value.replace(/\s/g, '').replace(',', '.');
          const parsed = Number(sanitized);
          if (!Number.isFinite(parsed)) {
            return row;
          }
          const isNegativeInput = sanitized.trim().startsWith('-');
          const magnitude = Math.abs(parsed);
          const sign = isNegativeInput ? -1 : row.amount >= 0 ? 1 : -1;
          return { ...row, amount: sign * magnitude };
        }

        if (key === 'category') {
          // Learn from user correction: if user selects a category, save merchant mapping
          if (value) {
            const category = categories.find(cat => cat.name === value);
            if (category) {
              // Fire-and-forget: learn merchant mapping in background
              // Convert string ID to number for database
              const categoryId = Number.parseInt(category.id, 10);
              if (!Number.isNaN(categoryId)) {
                fetch('/api/merchants/learn', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    description: row.description,
                    categoryId,
                  }),
                }).catch(err => {
                  // Silently fail - learning is optional
                  console.debug('[merchant/learn] failed', err);
                });
              }
            }
          }
          return { ...row, category: value || null };
        }

        return { ...row, [key]: value };
      }),
    );
  };

  const handleRowDelete = (id: string) => {
    setParsedRows(prev => prev.filter(row => row.id !== id));
  };

  const handleConfirmImport = async () => {
    if (!parsedRows.length) return;

    setIsConfirming(true);
    try {
      const payload = parsedRows.map(row => ({
        date: row.date,
        description: row.description,
        translatedDescription: row.translatedDescription,
        amount: row.amount,
        category: row.category,
        confidence: row.confidence,
      }));

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: payload }),
      });

      if (!response.ok) {
        throw new Error(`Import failed with status ${response.status}`);
      }

      setParsedRows([]);
      resetUploadState();
    } catch (error) {
      console.error('[import/confirm]', error);
      setUploadState('error');
      setStatusNote('Unable to save imported transactions. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };


  const renderStatusBadge = () => {
    if (uploadState === 'idle') return null;
    const iconMap: Record<UploadState, JSX.Element | null> = {
      idle: null,
      queued: null,
      uploading: <Upload width={16} height={16} strokeWidth={1.5} />,
      processing: <Upload width={16} height={16} strokeWidth={1.5} />,
      categorizing: <Upload width={16} height={16} strokeWidth={1.5} />,
      ready: <CheckCircle width={16} height={16} strokeWidth={1.5} />,
      error: <WarningTriangle width={16} height={16} strokeWidth={1.5} />,
    };
    const labelMap: Record<UploadState, string> = {
      idle: '',
      queued: 'Queued',
      uploading: 'Uploading',
      processing: 'Processing',
      categorizing: 'Categorizing',
      ready: 'Parsing complete',
      error: 'Import failed',
    };

    const icon = iconMap[uploadState];
    return (
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {icon}
        <span>{labelMap[uploadState]}</span>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#202020]">
      <div className="hidden md:block">
        <DashboardHeader pageName="Import Transactions" />
      </div>
      <div className="md:hidden">
        <MobileNavbar
          pageName="Import Transactions"
          activeSection="transactions"
        />
      </div>

      <div className="px-4 md:px-6 pb-10 space-y-6">
        <Card title="Bank Statement Upload" showActions={false}>
          <div
            ref={dropZoneRef}
            className="border-2 border-dashed border-[#3a3a3a] rounded-3xl px-6 py-10 flex flex-col items-center justify-center gap-4 text-center transition-colors hover:border-[#AC66DA]"
            style={{ backgroundColor: '#282828' }}
          >
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Drag & drop your PDF here
            </h3>
            <p className="text-sm max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              We accept bank statements in PDF format. Transactions will be parsed automatically so you can review and save them in seconds.
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition-all cursor-pointer hover:opacity-90 active:scale-95"
                style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
              >
                Select PDF
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileInputChange} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Only .pdf · Max 15 MB recommended
              </span>
            </div>

            {uploadState !== 'idle' && uploadState !== 'ready' && (
              <div
                className="w-full max-w-xl space-y-3 rounded-[30px] border border-[#3a3a3a] px-6 py-5 mt-6"
                style={{ backgroundColor: '#282828' }}
              >
                {renderStatusBadge()}
                <ProgressBar value={progressValue} showLabel={false} />
                <div className="space-y-1.5">
                  {statusNote && (
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: uploadState === 'error' ? '#D93F3F' : 'var(--text-secondary)' }}
                    >
                      {statusNote}
                    </p>
                  )}
                  {uploadState !== 'ready' && uploadState !== 'error' && startTime !== null && (
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>Elapsed: {formatTime(elapsedSeconds)}</span>
                      {uploadState === 'processing' && elapsedSeconds > 5 && (
                        <>
                          <span>·</span>
                          <span>
                            Estimated remaining:{' '}
                            {(() => {
                              // Use transaction counts for accurate estimate if available
                              if (processedCount !== null && totalCount !== null && processedCount > 0 && totalCount > processedCount) {
                                const remaining = totalCount - processedCount;
                                const rate = processedCount / elapsedSeconds; // transactions per second
                                const estimatedSeconds = Math.ceil(remaining / rate);
                                return formatTime(estimatedSeconds);
                              }
                              // Fallback to simple heuristic
                              return elapsedSeconds > 0 ? formatTime(Math.floor(elapsedSeconds * 2)) : '—';
                            })()}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {uploadState === 'ready' && totalTimeSeconds !== null && (
                    <p className="text-xs font-medium" style={{ color: 'var(--accent-green)' }}>
                      Completed in {formatTime(totalTimeSeconds)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <RecentJobsList 
            onResumeJob={handleResumeJob} 
            currentJobId={currentJobId} 
          />
        </Card>

        {parsedRows.length > 0 && (
          <>
            <Card 
              title="Review Transactions" 
              showActions={false}
              customHeader={
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-card-header">Review Transactions</h2>
                  <button
                    onClick={() => setIsCategoryStatsOpen(true)}
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer hover:opacity-90"
                    style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
                  >
                    <Reports width={18} height={18} strokeWidth={1.5} />
                    View All Stats
                  </button>
                </div>
              }
            >
              <div className="flex flex-col gap-4">
                {/* Filters */}
                <div className={`flex flex-col md:flex-row md:items-center gap-3`}>
                  <div className="flex-[0.6]">
                    <SearchBar
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={setSearchQuery}
                    />
                  </div>
                  <div className="flex-[0.4]">
                    <CategoryFilter
                      categories={categories}
                      selectedCategory={categoryFilter}
                      onSelect={setCategoryFilter}
                    />
                  </div>
                  <div className="w-full md:w-40">
                    <TypeFilter
                      value={typeFilter}
                      onChange={setTypeFilter}
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-3xl border border-[#3a3a3a]" style={{ backgroundColor: '#202020' }}>
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                        <th className="px-5 py-3 align-top">Date</th>
                        <th className="px-5 py-3 align-top">Description</th>
                        <th className="px-5 py-3 align-top">Type</th>
                        <th className="px-5 py-3 align-top">Category</th>
                        <th className="px-5 py-3 align-top w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReviewRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                            No transactions match your filters.
                          </td>
                        </tr>
                      ) : (
                        paginatedReviewRows.map(row => {
                          const isExpense = row.amount < 0;
                          
                          return (
                            <tr key={row.id} className="border-t border-[#2A2A2A]">
                              <td className="px-5 py-4 align-top">
                                <input
                                  type="date"
                                  value={row.date}
                                  onChange={event => handleRowUpdate(row.id, 'date', event.target.value)}
                                  className="w-full rounded-xl border border-[#3a3a3a] bg-[#282828] px-3 py-2 text-sm"
                                  style={{ color: 'var(--text-primary)' }}
                                />
                              </td>
                              <td className="px-5 py-4 align-top">
                                <div className="space-y-1.5">
                                  <input
                                    type="text"
                                    value={row.description}
                                    onChange={event => handleRowUpdate(row.id, 'description', event.target.value)}
                                    className="w-full rounded-xl border border-[#3a3a3a] bg-[#282828] px-3 py-2 text-sm"
                                    style={{ color: 'var(--text-primary)' }}
                                    placeholder="Description"
                                  />
                                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    <Language width={14} height={14} strokeWidth={1.5} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                    <span>{row.translatedDescription || 'No translation'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 align-top">
                                <div className="space-y-1.5">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                      {currency.symbol}
                                    </span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      pattern="^-?\\d*(?:[\\.,]\\d{0,2})?$"
                                      value={Number.isFinite(row.amount) ? Math.abs(row.amount).toFixed(2) : ''}
                                      onChange={event => handleRowUpdate(row.id, 'amount', event.target.value)}
                                      className="w-full rounded-xl border border-[#3a3a3a] bg-[#282828] pl-8 pr-3 py-2 text-sm"
                                      style={{ color: 'var(--text-primary)' }}
                                    />
                                  </div>
                                  <span className="text-sm font-semibold" style={{ color: isExpense ? '#D93F3F' : '#74C648' }}>
                                    {isExpense ? 'Expense' : 'Income'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4 align-top">
                                <CategoryPicker
                                  categories={categories}
                                  selectedCategory={row.category ?? null}
                                  onSelect={(category) => handleRowUpdate(row.id, 'category', category ?? '')}
                                  suggestedCategory={row.suggestedCategory ?? null}
                                />
                              </td>
                              <td className="px-5 py-4 align-top">
                                <button
                                  type="button"
                                  onClick={() => handleRowDelete(row.id)}
                                  className="p-2 rounded-full transition-colors hover:opacity-80 cursor-pointer"
                                  style={{ backgroundColor: '#202020', color: '#D93F3F' }}
                                  title="Delete transaction"
                                >
                                  <Trash width={16} height={16} strokeWidth={1.5} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {reviewTotalPages > 1 && filteredRows.length > 0 && (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Showing {paginatedReviewRows.length} of {filteredRows.length} transactions
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewPage(prev => Math.max(1, prev - 1))}
                        disabled={reviewPage === 1}
                        className="px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:opacity-90"
                        style={{ backgroundColor: '#202020', color: 'var(--text-primary)' }}
                      >
                        Prev
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                          Page
                        </span>
                        <input
                          type="number"
                          min="1"
                          max={reviewTotalPages || 1}
                          value={reviewPageInput}
                          onChange={e => handleReviewPageInputChange(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleReviewPageInputSubmit();
                            }
                          }}
                          onBlur={handleReviewPageInputSubmit}
                          className="w-16 rounded-full border-none px-3 py-1 text-xs font-semibold text-center"
                          style={{ backgroundColor: '#202020', color: 'var(--text-primary)' }}
                        />
                        <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                          of {reviewTotalPages || 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewPage(prev => Math.min(reviewTotalPages, prev + 1))}
                        disabled={reviewPage >= reviewTotalPages}
                        className="px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:opacity-90"
                        style={{ backgroundColor: '#202020', color: 'var(--text-primary)' }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isConfirming}
                    onClick={handleConfirmImport}
                    className="rounded-full px-5 py-2 font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
                  >
                    {isConfirming ? 'Saving…' : 'Confirm Import'}
                  </button>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Category Stats Modal */}
        {isCategoryStatsOpen && parsedRows.length > 0 && (
          <CategoryStatsModal
            categories={categories}
            transactions={parsedRows.map(row => ({
              id: row.id,
              name: row.description,
              date: row.date,
              amount: row.amount,
              category: row.category,
              icon: row.category ? (categoryLookup.get(row.category)?.icon || 'HelpCircle') : 'HelpCircle',
            }))}
            timePeriod="Import Preview"
            onClose={() => setIsCategoryStatsOpen(false)}
          />
        )}
      </div>
    </main>
  );
}
