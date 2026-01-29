'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import Tooltip from '@/components/ui/Tooltip';
import SearchBar from '@/components/transactions/shared/SearchBar';
import CategoryFilter from '@/components/transactions/shared/CategoryFilter';
import CategoryPicker from '@/components/transactions/shared/CategoryPicker';
import TypeFilter from '@/components/transactions/shared/TypeFilter';
import CategoryStatsModal from '@/components/transactions/CategoryStatsModal';
import RecentJobsList, { type JobStatus } from '@/components/transactions/import/RecentJobsList';
import CurrencySelector from '@/components/transactions/import/CurrencySelector';
import ReviewDatePicker from '@/components/transactions/shared/ReviewDatePicker';
import { TransactionUploadResponse, TransactionUploadMetadata, UploadedTransaction, type Category } from '@/types/dashboard';
import { Upload, WarningTriangle, Reports, Language, Trash, NavArrowUp, NavArrowDown } from 'iconoir-react';
import { useCurrency } from '@/hooks/useCurrency';
import Toast, { ToastContainer, type ToastType } from '@/components/ui/Toast';
import { useCategories } from '@/hooks/useCategories';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';

type UploadState = 'idle' | 'queued' | 'uploading' | 'processing' | 'categorizing' | 'ready' | 'error';

type TableRow = UploadedTransaction & {
  id: string;
  suggestedCategory?: string | null;
};

const REVIEW_PAGE_SIZE = 10;

export default function ImportTransactionsPage() {
  const { currency, loading: currencyLoading } = useCurrency();
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
  const { categories } = useCategories();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCategoryStatsOpen, setIsCategoryStatsOpen] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [processedCount, setProcessedCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [statementMetadata, setStatementMetadata] = useState<TransactionUploadMetadata | null>(null);
  const { currencyOptions } = useCurrencyOptions();
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | null>(null);
  const [currencySelectionTouched, setCurrencySelectionTouched] = useState(false);
  const [currencySelectionError, setCurrencySelectionError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  const [jobsRefreshTrigger, setJobsRefreshTrigger] = useState(0);
  const [hasShownCompletionToast, setHasShownCompletionToast] = useState(false);
  const [optimisticJob, setOptimisticJob] = useState<{ id: string; fileName: string; status: JobStatus; createdAt: string } | null>(null);
  type SortColumn = 'date' | 'description' | 'amount' | 'category';
  type SortOrder = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Get selected currency object for display
  const selectedCurrency = useMemo(() => {
    if (!selectedCurrencyId) return null;
    return currencyOptions.find(opt => opt.id === selectedCurrencyId) ?? null;
  }, [selectedCurrencyId, currencyOptions]);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentProgressRef = useRef<number>(0);

  const filteredRows = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase();
    const filtered = parsedRows.filter(row => {
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

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'date': {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          comparison = dateA - dateB;
          break;
        }
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'category': {
          const catA = a.category || '';
          const catB = b.category || '';
          comparison = catA.localeCompare(catB);
          break;
        }
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [parsedRows, debouncedSearchQuery, categoryFilter, typeFilter, sortColumn, sortOrder]);


  // Reset page to 1 only when filters/search/sort change, not when rows are deleted
  // We track the previous filter/search/sort state to detect actual filter changes
  const prevFilterStateRef = useRef<{
    searchQuery: string;
    categoryFilter: string | null;
    typeFilter: string;
    sortColumn: SortColumn;
    sortOrder: SortOrder;
  }>({ searchQuery: '', categoryFilter: null, typeFilter: '', sortColumn: 'date', sortOrder: 'desc' });
  
  useEffect(() => {
    const currentFilterState = { searchQuery: debouncedSearchQuery, categoryFilter, typeFilter, sortColumn, sortOrder };
    const prevFilterState = prevFilterStateRef.current;
    
    // Only reset page if filters/search/sort actually changed (not just row count)
    if (
      prevFilterState.searchQuery !== currentFilterState.searchQuery ||
      prevFilterState.categoryFilter !== currentFilterState.categoryFilter ||
      prevFilterState.typeFilter !== currentFilterState.typeFilter ||
      prevFilterState.sortColumn !== currentFilterState.sortColumn ||
      prevFilterState.sortOrder !== currentFilterState.sortOrder
    ) {
      setReviewPage(1);
      setReviewPageInput('1');
      prevFilterStateRef.current = currentFilterState;
    }
  }, [debouncedSearchQuery, categoryFilter, typeFilter, sortColumn, sortOrder]);

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

  const isUploadBusy = ['queued', 'uploading', 'processing', 'categorizing'].includes(uploadState);


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

  useEffect(() => {
    if (currencySelectionTouched) return;
    if (!statementMetadata?.currency) return;
    if (!currencyOptions.length) return;
    const match = currencyOptions.find(
      option => option.alias?.toUpperCase() === statementMetadata.currency.toUpperCase(),
    );
    if (match) {
      setSelectedCurrencyId(match.id);
    }
  }, [statementMetadata, currencyOptions, currencySelectionTouched]);

  // Set user's currency as default when page loads (only if not touched and no statement metadata)
  useEffect(() => {
    // Don't set if user has manually selected a currency
    if (currencySelectionTouched) return;
    // Don't set if already selected
    if (selectedCurrencyId !== null) return;
    // Don't set if currency options aren't loaded yet
    if (!currencyOptions.length) return;
    // Don't set if currency context is still loading
    if (currencyLoading) return;
    // Don't set if statement metadata has a currency (let the other useEffect handle it)
    if (statementMetadata?.currency) return;
    // Don't set if currency.id is 0 (default/not loaded yet)
    if (currency.id === 0) return;
    
    // Find user's currency in the options list
    const userCurrency = currencyOptions.find(option => option.id === currency.id);
    if (userCurrency) {
      setSelectedCurrencyId(userCurrency.id);
    }
  }, [currencyOptions, currencySelectionTouched, selectedCurrencyId, statementMetadata, currency.id, currencyLoading]);

  const resetUploadState = () => {
    setUploadState('idle');
    setProgressValue(0);
    setStatusNote(null);
    setStartTime(null);
    setElapsedSeconds(0);
    setProcessedCount(null);
    setTotalCount(null);
    setCurrentJobId(null);
    setIsReviewLoading(false);
    setHasShownCompletionToast(false);
    setOptimisticJob(null);
    setSortColumn('date');
    setSortOrder('desc');
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

    setStatementMetadata(null);
    setSelectedCurrencyId(null);
    setCurrencySelectionTouched(false);
    setCurrencySelectionError(null);
  };

  const handleDeleteActiveJob = useCallback(() => {
    // Clear review table
    setParsedRows([]);
    // Reset dropzone to default state
    resetUploadState();
    // Reset review page to first page
    setReviewPage(1);
    setReviewPageInput('1');
    // Clear filters
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setCategoryFilter(null);
    setTypeFilter('');
  }, []);

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
          setStatusNote(null);
          setIsReviewLoading(false);
          return;
        }
        
        if (data.status === 'completed') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          
          // Process results similar to original flow
          const result = data.result as TransactionUploadResponse;
          
          if (!result || !result.transactions || result.transactions.length === 0) {
            setUploadState('error');
            setStatusNote(null);
            setIsReviewLoading(false);
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
            
          setElapsedSeconds(totalTime); // freeze elapsed
          
          setParsedRows(normalized);
          setStatementMetadata(result.metadata ?? null);
          setSelectedCurrencyId(null);
          setCurrencySelectionTouched(false);
          setCurrencySelectionError(null);
          setSortColumn('date');
          setSortOrder('desc');
          setUploadState('ready');
          setProgressValue(100);
          setStatusNote(null);
          setIsReviewLoading(false);
          
          // Show toast notification when processing completes
          if (!hasShownCompletionToast) {
            const transactionCount = normalized.length;
            const toastId = crypto.randomUUID();
            setToasts(prev => [...prev, {
              id: toastId,
              message: `PDF processed! Found ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}.`,
              type: 'success',
            }]);
            setHasShownCompletionToast(true);
          }
          
          // Trigger refresh of recent jobs list to update the UI
          setJobsRefreshTrigger(prev => prev + 1);
          
          // Trigger immediate notification refresh so new notification appears in dropdown
          // Use a small delay to ensure notification is created in DB first
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('refreshNotifications'));
          }, 500);
          
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
        setIsReviewLoading(false);
      }
    };
    
    // Poll every 1.5 seconds
    pollingIntervalRef.current = setInterval(poll, 1500);
    poll(); // initial call
  }, [startTime, hasShownCompletionToast]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Allow uploads when idle, ready, or error (to allow retry after error)
      if (!['idle', 'ready', 'error'].includes(uploadState)) {
        return;
      }
      if (file.type !== 'application/pdf') {
        setUploadState('error');
        setStatusNote(null);
        setIsReviewLoading(false);
        return;
      }

      // Reset state completely when starting a new upload (especially after error)
      if (uploadState === 'error') {
        resetUploadState();
      }

      // Reset drag-over state when starting upload
      setIsDragOver(false);
      
      // Reset toast flag for new upload
      setHasShownCompletionToast(false);

      // Reset and start timer
      const now = Date.now();
      setStartTime(now);
      setElapsedSeconds(0);
      setProgressValue(0);
      setProcessedCount(null);
      setTotalCount(null);
      setIsReviewLoading(true);

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
      setStatusNote('Preparing to upload PDF...');
      setProgressValue(5);

      const formData = new FormData();
      formData.append('file', file);

      try {
        // Upload phase - show immediately
        setUploadState('uploading');
        setProgressValue(10);
        setStatusNote('Uploading PDF...');

        const response = await fetch('/api/transactions/upload-bank-statement', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          await response.json().catch(() => null);
          setUploadState('error');
          setProgressValue(0);
          setStatusNote(null);
          setStartTime(null);
          setElapsedSeconds(0);
          setIsReviewLoading(false);
          return;
        }

        // New Async Flow: Get Job ID and start polling
        const result = await response.json() as { 
          jobId: string;
          fileName?: string;
          status: string;
          queuePosition?: number;
          message?: string;
          createdAt?: string;
        };
        
        if (!result.jobId) {
             throw new Error('No job ID received from server');
        }
        
        setCurrentJobId(result.jobId);

        // Create optimistic job entry for immediate display
        if (result.fileName && result.createdAt) {
          setOptimisticJob({
            id: result.jobId,
            fileName: result.fileName,
            status: (result.status === 'processing' || result.status === 'queued') ? result.status : 'queued',
            createdAt: result.createdAt,
          });
        }

        // Trigger refresh of recent jobs list to show the new job immediately
        setJobsRefreshTrigger(prev => prev + 1);

        // Show toast when upload starts/processing begins
        const uploadToastId = crypto.randomUUID();
        const fileName = result.fileName || file.name;
        const shortFileName = fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;
        if (result.queuePosition !== undefined && result.queuePosition > 0) {
          setToasts(prev => [...prev, {
            id: uploadToastId,
            message: `"${shortFileName}" uploaded! Processing will begin shortly...`,
            type: 'info',
          }]);
        } else {
          setToasts(prev => [...prev, {
            id: uploadToastId,
            message: `"${shortFileName}" uploaded! Processing in progress...`,
            type: 'info',
          }]);
        }

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
        setStatusNote(null);
        setStartTime(null);
        setElapsedSeconds(0);
        setIsReviewLoading(false);
      } finally {
        // Clean up
      }
    },
    [startPolling, uploadState],
  );

  const handleResumeJob = useCallback((jobId: string, jobStatus: JobStatus) => {
    setCurrentJobId(jobId);
    // Only reset toast flag for in-progress jobs (not completed ones)
    // For completed jobs, we don't want to show "PDF processed!" toast when just viewing
    if (jobStatus !== 'completed') {
      setHasShownCompletionToast(false);
    } else {
      setHasShownCompletionToast(true); // Prevent toast when viewing already-completed jobs
    }
    setOptimisticJob(null); // Clear optimistic job when resuming
    if (jobStatus === 'failed') {
      setUploadState('idle');
      setStatusNote(null);
      setParsedRows([]);
      setStatementMetadata(null);
      setSelectedCurrencyId(null);
      setCurrencySelectionTouched(false);
      setCurrencySelectionError(null);
      setSortColumn('date');
      setSortOrder('desc');
      setProgressValue(0);
      setProcessedCount(null);
      setTotalCount(null);
      setStartTime(null);
      setElapsedSeconds(0);
      setIsReviewLoading(false);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    setIsReviewLoading(true);

    setParsedRows([]);
    setStatementMetadata(null);
    setSelectedCurrencyId(null);
    setCurrencySelectionTouched(false);
    setCurrencySelectionError(null);
    setSortColumn('date');
    setSortOrder('desc');
    setProgressValue(0);
    setProcessedCount(null);
    setTotalCount(null);

    const isCompletedJob = jobStatus === 'completed';

    if (!isCompletedJob) {
      const now = Date.now();
      setStartTime(now);
      setElapsedSeconds(0);
    } else {
      setStartTime(null);
      setElapsedSeconds(0);
    }

    if (!isCompletedJob) {
      setUploadState('queued'); // Will be updated by first poll
      setStatusNote('Resuming job...');
    } else {
      setUploadState('idle');
      setStatusNote(null);
    }

    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    startPolling(jobId);
  }, [startPolling]);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);
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

    const handleDragEnter = (event: DragEvent) => {
      preventDefaults(event);
      // Only highlight if not busy and dragging files
      const isBusy = ['queued', 'uploading', 'processing', 'categorizing'].includes(uploadState);
      if (!isBusy && event.dataTransfer?.types.includes('Files')) {
        setIsDragOver(true);
      }
    };

    const handleDragOver = (event: DragEvent) => {
      preventDefaults(event);
      // Set dropEffect to show it's a valid drop target
      const isBusy = ['queued', 'uploading', 'processing', 'categorizing'].includes(uploadState);
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = isBusy ? 'none' : 'copy';
      }
    };

    const handleDragLeave = (event: DragEvent) => {
      preventDefaults(event);
      // Only reset if we're actually leaving the dropzone (not just a child element)
      const rect = dropZone.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setIsDragOver(false);
      }
    };

    dropZone.addEventListener('dragenter', handleDragEnter as EventListener);
    dropZone.addEventListener('dragover', handleDragOver as EventListener);
    dropZone.addEventListener('dragleave', handleDragLeave as EventListener);
    dropZone.addEventListener('drop', handleDrop as EventListener);

    return () => {
      dropZone.removeEventListener('dragenter', handleDragEnter as EventListener);
      dropZone.removeEventListener('dragover', handleDragOver as EventListener);
      dropZone.removeEventListener('dragleave', handleDragLeave as EventListener);
      dropZone.removeEventListener('drop', handleDrop as EventListener);
    };
  }, [handleDrop, uploadState]);

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
          // Don't learn here - learning happens on confirm import
          return { ...row, category: value || null };
        }

        return { ...row, [key]: value };
      }),
    );
  };

  const handleRowDelete = (id: string) => {
    setParsedRows(prev => {
      const newRows = prev.filter(row => row.id !== id);
      
      // After deletion, check if current page would be empty
      // Calculate what filteredRows would be after deletion
      const newFilteredRows = newRows.filter(row => {
        const matchesSearch = !debouncedSearchQuery || 
          row.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          (row.translatedDescription?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ?? false);
        const matchesCategory = !categoryFilter || row.category === categoryFilter;
        const matchesType = !typeFilter || 
          (typeFilter === 'expense' && row.amount < 0) ||
          (typeFilter === 'income' && row.amount >= 0);
        return matchesSearch && matchesCategory && matchesType;
      });
      
      const newTotalPages = newFilteredRows.length
        ? Math.ceil(newFilteredRows.length / REVIEW_PAGE_SIZE)
        : 1;
      
      // If current page would be empty and there are other pages, go to previous page
      if (reviewPage > newTotalPages && newTotalPages > 0) {
        const newPage = newTotalPages;
        setReviewPage(newPage);
        setReviewPageInput(newPage.toString());
      }
      
      return newRows;
    });
  };

  const handleConfirmImport = async () => {
    if (!parsedRows.length) return;
    if (!selectedCurrencyId) {
      setCurrencySelectionError('Select the statement currency before importing.');
      return;
    }

    setIsConfirming(true);
    try {
      setCurrencySelectionError(null);
      const payload = parsedRows.map(row => ({
        date: row.date,
        description: row.description,
        translatedDescription: row.translatedDescription,
        amount: row.amount,
        category: row.category,
        confidence: row.confidence,
      }));

      // Prepare merchants to learn: transactions where user selected a category
      // Use translatedDescription (English) instead of description (original language)
      const merchantsToLearn = parsedRows
        .filter(row => row.category) // Only learn if user selected a category
        .map(row => {
          const category = categories.find(cat => cat.name === row.category);
          if (!category) return null;
          
          const categoryId = Number.parseInt(category.id, 10);
          if (Number.isNaN(categoryId)) return null;
          
          return {
            description: row.translatedDescription || row.description, // Use translated description (English)
            categoryId,
          };
        })
        .filter((item): item is { description: string; categoryId: number } => item !== null);

      const requestBody: Record<string, unknown> = {
        transactions: payload,
        statementCurrencyId: selectedCurrencyId,
      };

      if (statementMetadata) {
        requestBody.metadata = statementMetadata;
      }

      if (merchantsToLearn.length > 0) {
        requestBody.merchantsToLearn = merchantsToLearn;
      }

      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Import failed with status ${response.status}`);
      }

      const result = await response.json();
      const importedCount = result.transactions?.length || parsedRows.length;

      // Show success toast (notification is created in the API)
      const toastId = crypto.randomUUID();
      setToasts(prev => [...prev, {
        id: toastId,
        message: `Successfully imported ${importedCount} transaction${importedCount !== 1 ? 's' : ''}!`,
        type: 'success',
      }]);

      setParsedRows([]);
      setStatementMetadata(null);
      setSelectedCurrencyId(null);
      setCurrencySelectionTouched(false);
      setOptimisticJob(null); // Clear optimistic job after import
      resetUploadState();
    } catch (error) {
      console.error('[import/confirm]', error);
      setUploadState('error');
      setStatusNote(null);
      
      // Show error toast
      const toastId = crypto.randomUUID();
      setToasts(prev => [...prev, {
        id: toastId,
        message: 'Failed to import transactions. Please try again.',
        type: 'error',
      }]);
    } finally {
      setIsConfirming(false);
    }
  };



  const renderStatusBadge = () => {
    if (uploadState === 'idle' || uploadState === 'ready') return null;
    const iconMap: Record<UploadState, JSX.Element | null> = {
      idle: null,
      queued: null,
      uploading: <Upload width={16} height={16} strokeWidth={1.5} />,
      processing: <Upload width={16} height={16} strokeWidth={1.5} />,
      categorizing: <Upload width={16} height={16} strokeWidth={1.5} />,
      ready: null,
      error: <WarningTriangle width={16} height={16} strokeWidth={1.5} />,
    };
    const labelMap: Record<UploadState, string> = {
      idle: '',
      queued: 'Queued',
      uploading: 'Uploading',
      processing: 'Processing',
      categorizing: 'Categorizing',
      ready: '',
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

      <div className="px-4 md:px-6 lg:px-8 pb-6 min-h-[calc(100vh-120px)]">
        <div className="flex flex-col gap-6 min-h-full">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.62fr)_minmax(320px,0.38fr)] items-stretch">
            <Card title="Bank Statement Upload" showActions={false} className="w-full h-full flex flex-col">
              <div className="flex flex-col gap-4 w-full flex-1">
                <div
                  ref={dropZoneRef}
                  className={`border-2 border-dashed rounded-3xl px-6 py-10 w-full flex-1 flex flex-col items-center justify-center gap-4 text-center transition-colors ${
                    isUploadBusy 
                      ? 'pointer-events-none opacity-100 border-[#3a3a3a]' 
                      : isDragOver 
                        ? 'border-[#AC66DA]' 
                        : 'border-[#3a3a3a] hover:border-[#AC66DA]'
                  }`}
                  style={{ backgroundColor: '#282828', minHeight: '320px' }}
                  aria-busy={isUploadBusy}
                  aria-live="polite"
                >
                  {isUploadBusy ? (
                    <div className="flex flex-col items-center justify-center gap-5 w-full max-w-xl">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                          Processing your statement
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          Hold tight while we parse your PDF. You can review the progress below.
                        </p>
                      </div>
                      <div
                        className="w-full space-y-3 rounded-[30px] border border-[#3a3a3a] px-6 py-5"
                        style={{ backgroundColor: '#282828' }}
                      >
                        {renderStatusBadge()}
                        <ProgressBar value={progressValue} showLabel={false} />
                        <div className="space-y-1.5">
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {statusNote || 'Processing PDF...'}
                          </p>
                          {startTime !== null && (
                            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              <span>Elapsed: {formatTime(elapsedSeconds)}</span>
                              {uploadState === 'processing' && elapsedSeconds > 5 && (
                                <>
                                  <span>·</span>
                                  <span>
                                    Estimated remaining:{' '}
                                    {(() => {
                                      if (
                                        processedCount !== null &&
                                        totalCount !== null &&
                                        processedCount > 0 &&
                                        totalCount > processedCount
                                      ) {
                                        const remaining = totalCount - processedCount;
                                        const rate = processedCount / elapsedSeconds;
                                        const estimatedSeconds = Math.ceil(remaining / rate);
                                        return formatTime(estimatedSeconds);
                                      }
                                      return elapsedSeconds > 0 ? formatTime(Math.floor(elapsedSeconds * 2)) : '—';
                                    })()}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            </Card>

            <Card
              title="Recent Imports"
              showActions={false}
              className="w-full h-full flex flex-col max-h-[420px]"
            >
              <RecentJobsList
                onResumeJob={handleResumeJob}
                currentJobId={currentJobId}
                showTitle={false}
                className="mt-2 flex-1 overflow-y-auto pr-2 pb-6"
                refreshTrigger={jobsRefreshTrigger}
                optimisticJob={optimisticJob}
                onDeleteActiveJob={handleDeleteActiveJob}
              />
            </Card>
          </div>

          <Card title="Review Transactions" showActions={false} className="flex-1 flex flex-col">
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-[0.6] min-w-0">
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
                <div className="w-full lg:w-auto lg:ml-auto">
                  <button
                    onClick={() => parsedRows.length > 0 && setIsCategoryStatsOpen(true)}
                    disabled={parsedRows.length === 0}
                    className="flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                    style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
                  >
                    <Reports width={18} height={18} strokeWidth={1.5} />
                    Category Breakdown
                  </button>
                </div>
              </div>

              <div
                className="relative w-full overflow-x-auto rounded-3xl border border-[#3a3a3a] flex-1"
                style={{ backgroundColor: '#202020', overflowY: 'visible' }}
                aria-busy={isReviewLoading}
              >
                {(isReviewLoading || isConfirming) && (
                  <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center"
                    style={{ backgroundColor: 'rgba(32, 32, 32, 0.85)', backdropFilter: 'blur(2px)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-full border-2 animate-spin"
                      style={{ borderColor: 'rgba(172,102,218,0.4)', borderTopColor: 'var(--accent-purple)' }}
                    />
                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {isConfirming ? 'Saving transactions…' : 'Loading transactions…'}
                    </p>
                  </div>
                )}
                <table className="min-w-full table-fixed">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                      <th 
                        className="px-5 py-3 align-top w-32 cursor-pointer hover:text-[#E7E4E4] transition-colors select-none"
                        onClick={() => {
                          if (sortColumn === 'date') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortColumn('date');
                            setSortOrder('desc');
                          }
                        }}
                      >
                        <span className="flex items-center gap-1">
                          Date
                          {sortColumn === 'date' && (
                            sortOrder === 'asc' ? (
                              <NavArrowUp width={14} height={14} strokeWidth={2} />
                            ) : (
                              <NavArrowDown width={14} height={14} strokeWidth={2} />
                            )
                          )}
                        </span>
                      </th>
                      <th 
                        className="px-5 py-3 align-top w-[40%] cursor-pointer hover:text-[#E7E4E4] transition-colors select-none"
                        onClick={() => {
                          if (sortColumn === 'description') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortColumn('description');
                            setSortOrder('asc');
                          }
                        }}
                      >
                        <span className="flex items-center gap-1">
                          Description
                          {sortColumn === 'description' && (
                            sortOrder === 'asc' ? (
                              <NavArrowUp width={14} height={14} strokeWidth={2} />
                            ) : (
                              <NavArrowDown width={14} height={14} strokeWidth={2} />
                            )
                          )}
                        </span>
                      </th>
                      <th 
                        className="px-5 py-3 align-top w-32 cursor-pointer hover:text-[#E7E4E4] transition-colors select-none"
                        onClick={() => {
                          if (sortColumn === 'amount') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortColumn('amount');
                            setSortOrder('desc');
                          }
                        }}
                      >
                        <span className="flex items-center gap-1">
                          Amount
                          {sortColumn === 'amount' && (
                            sortOrder === 'asc' ? (
                              <NavArrowUp width={14} height={14} strokeWidth={2} />
                            ) : (
                              <NavArrowDown width={14} height={14} strokeWidth={2} />
                            )
                          )}
                        </span>
                      </th>
                      <th 
                        className="px-5 py-3 align-top w-48 cursor-pointer hover:text-[#E7E4E4] transition-colors select-none"
                        onClick={() => {
                          if (sortColumn === 'category') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortColumn('category');
                            setSortOrder('asc');
                          }
                        }}
                      >
                        <span className="flex items-center gap-1">
                          Category
                          {sortColumn === 'category' && (
                            sortOrder === 'asc' ? (
                              <NavArrowUp width={14} height={14} strokeWidth={2} />
                            ) : (
                              <NavArrowDown width={14} height={14} strokeWidth={2} />
                            )
                          )}
                        </span>
                      </th>
                      <th className="px-5 py-3 align-top w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                          Select a recent import to preview its transactions.
                        </td>
                      </tr>
                    ) : (
                      paginatedReviewRows.map((row) => {
                        const isExpense = row.amount < 0;
                        return (
                          <tr key={row.id} className="border-t border-[#2A2A2A]">
                            <td className="px-5 py-4 align-top">
                              <ReviewDatePicker
                                value={row.date}
                                onChange={newDate => handleRowUpdate(row.id, 'date', newDate)}
                              />
                            </td>
                            <td className="px-5 py-4 align-top max-w-0">
                              <div className="space-y-1.5 max-w-full">
                                <input
                                  type="text"
                                  value={row.description}
                                  onChange={event => handleRowUpdate(row.id, 'description', event.target.value)}
                                  className="w-full rounded-xl border border-[#3a3a3a] bg-[#282828] px-3 py-2 text-sm truncate"
                                  style={{ color: 'var(--text-primary)' }}
                                  placeholder="Description"
                                  title={row.description}
                                />
                                <div className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: 'var(--text-secondary)' }}>
                                  <Language width={14} height={14} strokeWidth={1.5} className="shrink-0" style={{ color: 'var(--text-secondary)' }} />
                                  <Tooltip content={row.translatedDescription || 'No translation'}>
                                    <span className="truncate">
                                      {row.translatedDescription || 'No translation'}
                                    </span>
                                  </Tooltip>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <div className="space-y-1.5">
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {selectedCurrency?.symbol ?? currency.symbol}
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
                            <td className="px-5 py-4 align-top overflow-visible">
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

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {parsedRows.length > 0 &&`Showing ${paginatedReviewRows.length} of ${filteredRows.length} transactions`}
                </div>
                {reviewTotalPages > 1 && filteredRows.length > 0 && (
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
                )}
              </div>

              <div className="mt-6 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-end">
                  <CurrencySelector
                    options={currencyOptions}
                    selectedCurrencyId={selectedCurrencyId}
                    onSelect={(currencyId) => {
                      setSelectedCurrencyId(currencyId);
                      setCurrencySelectionTouched(true);
                      setCurrencySelectionError(null);
                    }}
                    disabled={isConfirming}
                  />
                  <button
                    type="button"
                    disabled={isConfirming || parsedRows.length === 0 || !selectedCurrencyId}
                    onClick={handleConfirmImport}
                    className="rounded-full px-6 py-2.5 font-semibold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap hover:scale-105 active:scale-95"
                    style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
                  >
                    {isConfirming ? 'Saving…' : 'Confirm Import'}
                  </button>
                  {currencySelectionError && (
                    <p className="text-xs" style={{ color: 'var(--error)' }}>
                      {currencySelectionError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

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
      
      {/* Toast Container */}
      <ToastContainer
        toasts={toasts}
        onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
      />
    </div>
  </main>
  );
}
