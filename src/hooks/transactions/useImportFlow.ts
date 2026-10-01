'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TransactionUploadMetadata, UploadedTransaction } from '@/types/dashboard';
import type { ToastType } from '@/components/ui/Toast';
import { apiFetch, isApiError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';
import { useCurrency } from '@/hooks/useCurrency';
import { useCurrencyOptions } from '@/hooks/useCurrencyOptions';
import { useCategories } from '@/hooks/useCategories';
import { addOptimisticJob, JOB_LISTS_KEY, type JobStatus } from '@/hooks/transactions/useImportJobs';
import { invalidateMoneyData } from '@/hooks/transactions/useTransactionMutations';
import {
  applyRowEdit,
  autoSelectCurrency,
  buildImportBody,
  deriveUploadState,
  isTerminal,
  notifyNotificationsChanged,
  progressFor,
  statusNoteFor,
  toReviewRow,
  uploadNote,
  type JobStatusResponse,
  type Phase,
  type PollSession,
  type ReviewRow,
  type UploadResponse,
} from '@/hooks/transactions/importFlowModel';

export type { ReviewRow, UploadState } from '@/hooks/transactions/importFlowModel';

const UPLOAD_URL = '/api/transactions/upload-bank-statement';
const jobStatusUrl = (jobId: string) => `${UPLOAD_URL}/${jobId}/status`;
const IMPORT_URL = '/api/transactions/import';
const STATUS_POLL_MS = 1500;
const CLOCK_TICK_MS = 100;

interface UseImportFlowOptions {
  addToast: (message: string, type?: ToastType) => void;
  /** Called when a job's rows replace the review table (resets sorting). */
  onRowsReplaced: () => void;
  /** Called when the active job is deleted (resets filters and sorting). */
  onCleared: () => void;
}

/**
 * Upload, job polling, review rows and confirm for the PDF import page. Job status is polled with
 * React Query's refetchInterval until the job completes or fails.
 */
export function useImportFlow({ addToast, onRowsReplaced, onCleared }: UseImportFlowOptions) {
  const authReady = useAuthReadyForApi();
  const queryClient = useQueryClient();
  const { currency, loading: currencyLoading } = useCurrency();
  const { currencyOptions } = useCurrencyOptions();
  const { categories } = useCategories();

  const [phase, setPhase] = useState<Phase>('idle');
  const [session, setSession] = useState<PollSession | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [metadata, setMetadata] = useState<TransactionUploadMetadata | null>(null);
  const [manualCurrencyId, setManualCurrencyId] = useState<number | null>(null);
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [currencyError, setCurrencyError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const handledSessionRef = useRef<number | null>(null);
  const sessionCounterRef = useRef(0);

  const statusQuery = useQuery({
    queryKey: [...queryKeys.jobs.detail(session?.jobId ?? ''), 'status', session?.id ?? 0],
    queryFn: async () => {
      const activeSession = session as PollSession;
      const data = await apiFetch<JobStatusResponse>(jobStatusUrl(activeSession.jobId));
      if (data.status === 'completed' || data.status === 'failed') handleTerminal(data, activeSession);
      return data;
    },
    enabled: authReady && phase === 'polling' && session !== null,
    refetchInterval: (query) => (isTerminal(query.state.data?.status) ? false : STATUS_POLL_MS),
    refetchOnWindowFocus: false,
    gcTime: 0,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return apiFetch<UploadResponse>(UPLOAD_URL, { method: 'POST', body });
    },
  });

  const importMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch<{ transactions?: unknown[] }>(IMPORT_URL, { method: 'POST', body }),
    onSuccess: () => invalidateMoneyData(queryClient, false),
  });

  const pollData = phase === 'polling' ? statusQuery.data : undefined;
  const uploadState = deriveUploadState(phase, session, pollData);
  const isBusy = uploadState === 'queued' || uploadState === 'uploading' || uploadState === 'processing';

  useEffect(() => {
    if (!isBusy) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
    };
    const timer = setInterval(tick, CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, [isBusy]);

  const startTime = phase === 'uploading' || phase === 'polling' ? (session?.startTime ?? null) : null;
  const elapsedSeconds = startTime === null ? 0 : Math.floor(Math.max(0, now - startTime) / 1000);

  const autoCurrencyId = autoSelectCurrency(metadata, currencyOptions, currency.id, currencyLoading);
  const selectedCurrencyId = currencyTouched ? manualCurrencyId : autoCurrencyId;
  const selectedCurrency = currencyOptions.find((option) => option.id === selectedCurrencyId) ?? null;

  function handleTerminal(data: JobStatusResponse, activeSession: PollSession) {
    if (handledSessionRef.current === activeSession.id) return;
    handledSessionRef.current = activeSession.id;

    const transactions = data.status === 'completed' ? (data.result?.transactions ?? []) : [];
    if (transactions.length === 0) {
      setPhase('error');
      return;
    }

    const normalized = transactions.map(toReviewRow);
    setRows(normalized);
    setMetadata(data.result?.metadata ?? null);
    resetCurrency();
    onRowsReplaced();
    setPhase('ready');

    if (!activeSession.silent) {
      const count = normalized.length;
      addToast(`PDF processed! Found ${count} transaction${count !== 1 ? 's' : ''}.`, 'success');
    }
    queryClient.invalidateQueries({ queryKey: JOB_LISTS_KEY });
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    setTimeout(notifyNotificationsChanged, 500);
  }

  function startSession(jobId: string, options: Omit<PollSession, 'id' | 'jobId'>) {
    sessionCounterRef.current += 1;
    setSession({ id: sessionCounterRef.current, jobId, ...options });
    setPhase('polling');
  }

  function resetCurrency() {
    setManualCurrencyId(null);
    setCurrencyTouched(false);
    setCurrencyError(null);
  }

  function resetAll() {
    setPhase('idle');
    setSession(null);
    setCurrentJobId(null);
    setMetadata(null);
    resetCurrency();
  }

  const uploadFile = async (file: File) => {
    if (isBusy) return;
    if (file.type !== 'application/pdf') {
      setPhase('error');
      return;
    }
    if (phase === 'error') resetAll();

    const start = Date.now();
    setNow(start);
    setSession({ id: 0, jobId: '', showProgress: true, silent: false, startTime: start, initialState: 'queued', initialNote: '' });
    setPhase('uploading');

    try {
      const result = await uploadMutation.mutateAsync(file);
      if (!result.jobId) throw new Error('No job ID received from server');
      setCurrentJobId(result.jobId);

      if (result.fileName && result.createdAt) {
        const status = result.status === 'processing' || result.status === 'queued' ? result.status : 'queued';
        addOptimisticJob(queryClient, { id: result.jobId, fileName: result.fileName, status, createdAt: result.createdAt });
      }

      const queuePosition = result.queuePosition;
      const fileName = result.fileName || file.name;
      const shortName = fileName.length > 30 ? `${fileName.substring(0, 27)}...` : fileName;
      const isQueued = queuePosition !== undefined && queuePosition > 0;
      const uploadedMessage = isQueued
        ? `"${shortName}" uploaded! Processing will begin shortly...`
        : `"${shortName}" uploaded! Processing in progress...`;
      addToast(uploadedMessage, 'info');

      startSession(result.jobId, {
        showProgress: true,
        silent: false,
        startTime: start,
        initialState: queuePosition === 0 ? 'processing' : 'queued',
        initialNote: uploadNote(queuePosition),
      });
    } catch (error) {
      const body = isApiError(error) ? (error.body as { code?: string; error?: string } | undefined) : undefined;
      if (body?.code === 'PDF_IMPORT_LIMIT' && body.error) addToast(body.error, 'error');
      setSession(null);
      setPhase('error');
    }
  };

  const resumeJob = (jobId: string, status: JobStatus) => {
    setCurrentJobId(jobId);
    setRows([]);
    setMetadata(null);
    resetCurrency();
    onRowsReplaced();

    if (status === 'failed') {
      setSession(null);
      setPhase('idle');
      return;
    }

    const isCompleted = status === 'completed';
    const start = Date.now();
    setNow(start);
    startSession(jobId, {
      showProgress: !isCompleted,
      silent: isCompleted,
      startTime: isCompleted ? null : start,
      initialState: 'queued',
      initialNote: 'Resuming job...',
    });
  };

  const clearActiveJob = () => {
    setRows([]);
    resetAll();
    onCleared();
  };

  const selectCurrency = (currencyId: number | null) => {
    setManualCurrencyId(currencyId);
    setCurrencyTouched(true);
    setCurrencyError(null);
  };

  const updateRow = (id: string, key: keyof UploadedTransaction, value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? applyRowEdit(row, key, value) : row)));
  };

  const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const confirmImport = async () => {
    if (!rows.length) return;
    if (!selectedCurrencyId) {
      setCurrencyError('Select the statement currency before importing.');
      return;
    }
    setCurrencyError(null);
    const body = buildImportBody(rows, categories, selectedCurrencyId, metadata);

    try {
      const result = await importMutation.mutateAsync(body);
      const importedCount = result.transactions?.length || rows.length;
      addToast(`Successfully imported ${importedCount} transaction${importedCount !== 1 ? 's' : ''}!`, 'success');
      setRows([]);
      resetAll();
    } catch {
      setPhase('error');
      addToast('Failed to import transactions. Please try again.', 'error');
    }
  };

  return {
    uploadState,
    isBusy,
    progressValue: progressFor(phase, pollData),
    statusNote: statusNoteFor(phase, session, pollData),
    startTime,
    elapsedSeconds,
    processedCount: pollData?.processedCount ?? null,
    totalCount: pollData?.totalCount ?? null,
    isReviewLoading: phase === 'uploading' || phase === 'polling',
    isConfirming: importMutation.isPending,
    currentJobId,
    rows,
    categories,
    currencyOptions,
    selectedCurrencyId,
    reviewCurrencySymbol: selectedCurrency?.symbol ?? currency.symbol,
    currencyError,
    uploadFile,
    resumeJob,
    clearActiveJob,
    selectCurrency,
    updateRow,
    deleteRow,
    confirmImport,
  };
}
