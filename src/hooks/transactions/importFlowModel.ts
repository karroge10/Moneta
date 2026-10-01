import type { TransactionUploadMetadata, TransactionUploadResponse, UploadedTransaction } from '@/types/dashboard';
import type { JobStatus } from '@/hooks/transactions/useImportJobs';

/** Types and pure helpers behind useImportFlow: derived upload UI state, row edits, request body. */

export type UploadState = 'idle' | 'queued' | 'uploading' | 'processing' | 'ready' | 'error';

export type ReviewRow = UploadedTransaction & {
  id: string;
  suggestedCategory?: string | null;
};

export interface JobStatusResponse {
  status: JobStatus;
  progress: number | null;
  processedCount: number | null;
  totalCount: number | null;
  queuePosition: number;
  result?: TransactionUploadResponse | null;
  error: string | null;
}

export interface UploadResponse {
  jobId: string;
  fileName?: string;
  status: string;
  queuePosition?: number;
  createdAt?: string;
}

/** One polling run for a job: a fresh upload or a job resumed from the list. */
export interface PollSession {
  id: number;
  jobId: string;
  /** Show the progress panel (false when reopening a completed job). */
  showProgress: boolean;
  /** Skip the "PDF processed" toast (reopening a completed job). */
  silent: boolean;
  startTime: number | null;
  initialState: 'queued' | 'processing';
  initialNote: string;
}

export type Phase = 'idle' | 'uploading' | 'polling' | 'ready' | 'error';

/** Legacy listeners (notification bell) refresh on this window event. */
export function notifyNotificationsChanged() {
  const event = new CustomEvent('refreshNotifications');
  window.dispatchEvent(event);
}

export function isTerminal(status: JobStatus | undefined): boolean {
  return status === 'completed' || status === 'failed';
}

export function deriveUploadState(phase: Phase, session: PollSession | null, data: JobStatusResponse | undefined): UploadState {
  if (phase === 'uploading') return 'uploading';
  if (phase === 'ready') return 'ready';
  if (phase === 'error') return 'error';
  if (phase !== 'polling' || !session?.showProgress) return 'idle';
  if (data?.status === 'processing') return 'processing';
  if (data?.status === 'queued') return 'queued';
  return session.initialState;
}

export function progressFor(phase: Phase, data: JobStatusResponse | undefined): number {
  if (phase === 'ready') return 100;
  if (phase === 'uploading') return 10;
  if (phase !== 'polling') return 0;
  return typeof data?.progress === 'number' ? Math.max(5, data.progress) : 5;
}

export function statusNoteFor(phase: Phase, session: PollSession | null, data: JobStatusResponse | undefined): string | null {
  if (phase === 'uploading') return 'Uploading PDF...';
  if (phase !== 'polling') return null;
  if (data?.status === 'queued') {
    return data.queuePosition > 0 ? `Queued: ${data.queuePosition} users ahead of you.` : 'Queued: Waiting for worker...';
  }
  if (data?.status === 'processing') {
    const hasCounts = data.processedCount != null && data.totalCount != null;
    return hasCounts ? `Processing transaction ${data.processedCount} of ${data.totalCount}...` : 'Processing PDF...';
  }
  return session?.initialNote || null;
}

export function uploadNote(queuePosition: number | undefined): string {
  if (queuePosition === undefined) return 'Uploading PDF...';
  if (queuePosition > 0) return `Queued: ${queuePosition} users ahead in queue`;
  return 'Processing PDF... (No queue - processing immediately)';
}

/** Statement currency from the PDF metadata, else the user's own currency. */
export function autoSelectCurrency(
  metadata: TransactionUploadMetadata | null,
  options: Array<{ id: number; alias: string }>,
  userCurrencyId: number,
  currencyLoading: boolean,
): number | null {
  if (!options.length) return null;
  if (metadata?.currency) {
    const alias = metadata.currency.toUpperCase();
    return options.find((option) => option.alias?.toUpperCase() === alias)?.id ?? null;
  }
  if (currencyLoading || userCurrencyId === 0) return null;
  return options.find((option) => option.id === userCurrencyId)?.id ?? null;
}

export function toReviewRow(item: UploadedTransaction): ReviewRow {
  const category = item.category && item.category.toLowerCase() !== 'currency exchange' ? item.category : null;
  return {
    id: crypto.randomUUID(),
    date: item.date,
    description: item.description,
    translatedDescription: item.translatedDescription,
    amount: item.amount,
    category,
    confidence: item.confidence,
    suggestedCategory: category,
  };
}

export function applyRowEdit(row: ReviewRow, key: keyof UploadedTransaction, value: string): ReviewRow {
  if (key === 'category') return { ...row, category: value || null };
  if (key !== 'amount') return { ...row, [key]: value };

  const sanitized = value.replace(/\s/g, '').replace(',', '.');
  const parsed = Number(sanitized);
  if (!Number.isFinite(parsed)) return row;
  const isNegativeInput = sanitized.startsWith('-');
  const sign = isNegativeInput || row.amount < 0 ? -1 : 1;
  return { ...row, amount: sign * Math.abs(parsed) };
}

export function buildImportBody(
  rows: ReviewRow[],
  categories: Array<{ id: string; name: string }>,
  statementCurrencyId: number,
  metadata: TransactionUploadMetadata | null,
): Record<string, unknown> {
  const transactions = rows.map((row) => ({
    date: row.date,
    description: row.description,
    translatedDescription: row.translatedDescription,
    amount: row.amount,
    category: row.category,
    confidence: row.confidence,
  }));

  const merchantsToLearn = rows.flatMap((row) => {
    const category = row.category ? categories.find((item) => item.name === row.category) : undefined;
    const categoryId = category ? Number.parseInt(category.id, 10) : Number.NaN;
    if (Number.isNaN(categoryId)) return [];
    return [{ description: row.translatedDescription || row.description, categoryId }];
  });

  const body: Record<string, unknown> = { transactions, statementCurrencyId };
  if (metadata) body.metadata = metadata;
  if (merchantsToLearn.length > 0) body.merchantsToLearn = merchantsToLearn;
  return body;
}
