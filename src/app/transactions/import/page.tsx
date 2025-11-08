'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MobileNavbar from '@/components/MobileNavbar';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import { mockCategories } from '@/lib/mockData';
import { getIcon } from '@/lib/iconMapping';
import { TransactionUploadResponse, UploadedTransaction, type Category } from '@/types/dashboard';
import { CheckCircle, Upload, WarningTriangle } from 'iconoir-react';

type UploadState = 'idle' | 'queued' | 'uploading' | 'processing' | 'categorizing' | 'ready' | 'error';

type TableRow = UploadedTransaction & {
  id: string;
};

interface PaginatedResponse {
  transactions: UploadedTransaction[];
  total: number;
}

const PAGE_SIZE = 12;
const REVIEW_PAGE_SIZE = 12;

export default function ImportTransactionsPage() {
  const [timePeriod, setTimePeriod] = useState<'This Month' | 'This Quarter' | 'This Year' | 'All Time'>('This Year');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progressValue, setProgressValue] = useState(0);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<TableRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isFetchingConfirmed, setIsFetchingConfirmed] = useState(false);
  const [confirmedTransactions, setConfirmedTransactions] = useState<TableRow[]>([]);
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  const filteredRows = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return parsedRows.filter(row => {
      const matchesQuery =
        !query ||
        row.description.toLowerCase().includes(query) ||
        row.translatedDescription.toLowerCase().includes(query) ||
        row.category?.toLowerCase().includes(query) ||
        row.date.toLowerCase().includes(query);
      const matchesCategory = !categoryFilter || row.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [parsedRows, searchQuery, categoryFilter]);

  useEffect(() => {
    setReviewPage(1);
  }, [filteredRows.length]);

  const reviewTotalPages = filteredRows.length
    ? Math.ceil(filteredRows.length / REVIEW_PAGE_SIZE)
    : 1;

  useEffect(() => {
    if (reviewPage > reviewTotalPages) {
      setReviewPage(reviewTotalPages);
    }
  }, [reviewPage, reviewTotalPages]);

  const paginatedReviewRows = useMemo(() => {
    const start = (reviewPage - 1) * REVIEW_PAGE_SIZE;
    return filteredRows.slice(start, start + REVIEW_PAGE_SIZE);
  }, [filteredRows, reviewPage]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'GEL',
        currencyDisplay: 'code',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const categoryLookup = useMemo(() => {
    const map = new Map<string, Category>();
    mockCategories.forEach(category => {
      map.set(category.name, category);
    });
    return map;
  }, []);

  const resetUploadState = () => {
    setUploadState('idle');
    setProgressValue(0);
    setStatusNote(null);
  };

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        setUploadState('error');
        setStatusNote('Only PDF files are supported right now.');
        return;
      }

      setUploadState('queued');
      setStatusNote(`Preparing to upload “${file.name}”`);
      setProgressValue(10);

      const formData = new FormData();
      formData.append('file', file);

      try {
        setUploadState('uploading');
        setStatusNote(`Uploading “${file.name}”`);
        setProgressValue(35);
        const response = await fetch('/api/transactions/upload-bank-statement', {
          method: 'POST',
          body: formData,
        });

        setUploadState('processing');
        setStatusNote('Processing PDF…');
        setProgressValue(60);

        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }

        const data = (await response.json()) as TransactionUploadResponse;

        setUploadState('categorizing');
        setStatusNote('Categorizing transactions…');
        setProgressValue(85);

        const normalized: TableRow[] = (data.transactions ?? []).map(item => ({
          id: crypto.randomUUID(),
          date: item.date,
          description: item.description,
          translatedDescription: item.translatedDescription,
          amount: item.amount,
          category: item.category,
          confidence: item.confidence,
        }));

        if (!normalized.length) {
          setUploadState('error');
          setProgressValue(0);
          setStatusNote('No transactions were detected in that PDF.');
          return;
        }

        setParsedRows(normalized);
        setUploadState('ready');
        setProgressValue(100);
        setStatusNote(`${normalized.length} transactions parsed successfully.`);
      } catch (error) {
        console.error('[import/upload]', error);
        setUploadState('error');
        setProgressValue(0);
        setStatusNote('We could not parse that PDF. Double-check the file and try again.');
      }
    },
    [],
  );

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

  const handleRowUpdate = (id: string, key: keyof UploadedTransaction, value: string) => {
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
          return { ...row, category: value || null };
        }

        return { ...row, [key]: value };
      }),
    );
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

      await fetchConfirmedTransactions(1, searchQuery, categoryFilter);
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

  const handleToggleDirection = (id: string) => {
    setParsedRows(prev =>
      prev.map(row => (row.id === id ? { ...row, amount: row.amount * -1 } : row)),
    );
  };

  const fetchConfirmedTransactions = useCallback(
    async (page: number, query: string, category: string | null) => {
      setIsFetchingConfirmed(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: PAGE_SIZE.toString(),
        });
        if (query) params.set('search', query);
        if (category) params.set('category', category);

        const response = await fetch(`/api/transactions/import?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to load confirmed transactions (${response.status})`);
        }

        const data = (await response.json()) as PaginatedResponse;
        setConfirmedTransactions(
          data.transactions.map(item => ({
            id: crypto.randomUUID(),
            ...item,
          })),
        );
        setConfirmedTotal(data.total);
        setCurrentPage(page);
      } catch (error) {
        console.error('[import/fetchConfirmed]', error);
      } finally {
        setIsFetchingConfirmed(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchConfirmedTransactions(1, searchQuery, categoryFilter);
  }, [fetchConfirmedTransactions, searchQuery, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(confirmedTotal / PAGE_SIZE));

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
        <DashboardHeader pageName="Import Transactions" timePeriod={timePeriod} onTimePeriodChange={setTimePeriod} />
      </div>
      <div className="md:hidden">
        <MobileNavbar
          pageName="Import Transactions"
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          activeSection="transactions"
        />
      </div>

      <div className="px-4 md:px-6 pb-10 space-y-6">
        <Card title="Bank Statement Upload" showActions={false}>
          <div
            ref={dropZoneRef}
            className="border-2 border-dashed border-[#3a3a3a] rounded-3xl px-6 py-10 flex flex-col items-center justify-center gap-4 text-center transition-colors hover:border-[#AC66DA]"
            style={{ backgroundColor: '#181818' }}
          >
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Drag & drop your PDF here
            </h3>
            <p className="text-sm max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              We accept bank statements in PDF format. Transactions will be parsed automatically so you can review and save them in seconds.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full px-4 py-2 font-semibold transition-colors cursor-pointer hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
              >
                Select PDF
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileInputChange} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Only .pdf · Max 15 MB recommended
              </span>
            </div>

            {uploadState !== 'idle' && (
              <div className="w-full max-w-xl space-y-3 rounded-2xl border border-[#3a3a3a] px-5 py-4 mt-6" style={{ backgroundColor: '#202020' }}>
                {renderStatusBadge()}
                <ProgressBar value={progressValue} showLabel={false} />
                {statusNote && (
                  <p className="text-xs" style={{ color: uploadState === 'error' ? '#F87171' : 'var(--text-secondary)' }}>
                    {statusNote}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {parsedRows.length > 0 && (
          <Card title="Review Transactions" showActions={false}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <input
                  type="text"
                  placeholder="Search description, category, or date"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  className="w-full md:flex-1 rounded-2xl border border-[#3a3a3a] bg-[#181818] px-4 py-2 text-sm"
                  style={{ color: 'var(--text-primary)' }}
                />
                <select
                  value={categoryFilter ?? ''}
                  onChange={event => setCategoryFilter(event.target.value || null)}
                  className="w-full md:w-60 rounded-2xl border border-[#3a3a3a] bg-[#181818] px-4 py-2 text-sm"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <option value="">All categories</option>
                  {mockCategories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-[#3a3a3a]">
                <table className="min-w-full" style={{ backgroundColor: '#161616' }}>
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3">Amount (GEL)</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReviewRows.map(row => {
                      const matchedCategory = row.category ? categoryLookup.get(row.category) : undefined;
                      const suggestionLabel = row.category ?? null;
                      const suggestionColor = matchedCategory?.color ?? '#9CA3AF';
                      const CategoryIcon = getIcon(matchedCategory?.icon ?? 'HelpCircle');
                      return (
                        <tr key={row.id} className="border-t border-[#2A2A2A]">
                          <td className="px-5 py-4 align-top">
                            <input
                              type="date"
                              value={row.date}
                              onChange={event => handleRowUpdate(row.id, 'date', event.target.value)}
                              className="w-full rounded-xl border border-[#3a3a3a] bg-[#202020] px-3 py-2 text-sm"
                              style={{ color: 'var(--text-primary)' }}
                            />
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="space-y-2">
                              <textarea
                                value={row.description}
                                onChange={event => handleRowUpdate(row.id, 'description', event.target.value)}
                                className="w-full rounded-xl border border-[#3a3a3a] bg-[#202020] px-3 py-2 text-sm resize-none"
                                style={{ color: 'var(--text-primary)', minHeight: '48px' }}
                              />
                              <textarea
                                value={row.translatedDescription}
                                onChange={event => handleRowUpdate(row.id, 'translatedDescription', event.target.value)}
                                className="w-full rounded-xl border border-[#3a3a3a] bg-[#1a1a1a] px-3 py-2 text-xs resize-none"
                                style={{ color: 'var(--text-primary)', minHeight: '40px' }}
                                placeholder="English translation"
                              />
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                inputMode="decimal"
                                pattern="^-?\\d*(?:[\\.,]\\d{0,2})?$"
                                value={Number.isFinite(row.amount) ? Math.abs(row.amount).toFixed(2) : ''}
                                onChange={event => handleRowUpdate(row.id, 'amount', event.target.value)}
                                className="w-full rounded-xl border border-[#3a3a3a] bg-[#202020] px-3 py-2 text-sm"
                                style={{ color: 'var(--text-primary)' }}
                              />
                              <div className="flex items-center justify-between text-xs font-medium">
                                <span
                                  style={{
                                    color: row.amount >= 0 ? '#2ECC71' : '#E74C3C',
                                  }}
                                >
                                  {currencyFormatter.format(Math.abs(row.amount || 0))}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDirection(row.id)}
                                  className="rounded-full px-3 py-1 transition-colors"
                                  style={{ backgroundColor: '#282828', color: '#9CA3AF' }}
                                >
                                  {row.amount >= 0 ? 'Incoming' : 'Outgoing'}
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="space-y-1.5">
                              <select
                                value={row.category ?? ''}
                                onChange={event => handleRowUpdate(row.id, 'category', event.target.value)}
                                className="w-full rounded-xl border border-[#3a3a3a] bg-[#202020] px-3 py-2 text-sm"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                <option value="">Uncategorized</option>
                                {mockCategories.map(category => (
                                  <option key={category.id} value={category.name}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                              <div className="inline-flex items-center gap-2 text-xs font-medium">
                                {suggestionLabel ? (
                                  <>
                                    <span
                                      className="inline-flex h-6 w-6 items-center justify-center rounded-full"
                                      style={{ backgroundColor: `${suggestionColor}1a` }}
                                    >
                                      <CategoryIcon
                                        width={14}
                                        height={14}
                                        strokeWidth={1.5}
                                        style={{ color: suggestionColor }}
                                      />
                                    </span>
                                    <span style={{ color: suggestionColor }}>
                                      Suggested: {suggestionLabel}
                                    </span>
                                  </>
                                ) : (
                                  <span style={{ color: '#9CA3AF' }}>No category suggested</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span
                              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                              style={{
                                backgroundColor: '#202020',
                                color: row.confidence >= 0.85 ? '#2ECC71' : row.confidence >= 0.65 ? '#F1C40F' : '#E74C3C',
                              }}
                            >
                              {(row.confidence * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedReviewRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                          No transactions match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {reviewTotalPages > 1 && filteredRows.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewPage(prev => Math.max(1, prev - 1))}
                    disabled={reviewPage === 1}
                    className="rounded-full px-3 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#282828', color: 'var(--text-primary)' }}
                  >
                    Previous
                  </button>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Page {reviewPage} of {reviewTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReviewPage(prev => Math.min(reviewTotalPages, prev + 1))}
                    disabled={reviewPage === reviewTotalPages}
                    className="rounded-full px-3 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#282828', color: 'var(--text-primary)' }}
                  >
                    Next
                  </button>
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
        )}

        <Card title="Imported History" showActions={false}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search imported transactions"
                className="w-full md:flex-1 rounded-2xl border border-[#3a3a3a] bg-[#181818] px-4 py-2 text-sm"
                style={{ color: 'var(--text-primary)' }}
              />
              <select
                value={categoryFilter ?? ''}
                onChange={event => setCategoryFilter(event.target.value || null)}
                className="w-full md:w-60 rounded-2xl border border-[#3a3a3a] bg-[#181818] px-4 py-2 text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                <option value="">All categories</option>
                {mockCategories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-[#3a3a3a]" style={{ backgroundColor: '#161616' }}>
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Amount (GEL)</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {isFetchingConfirmed ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Loading confirmed transactions…
                      </td>
                    </tr>
                  ) : confirmedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                        No imported transactions yet.
                      </td>
                    </tr>
                  ) : (
                    confirmedTransactions.map(row => (
                      <tr key={row.id} className="border-t border-[#2A2A2A]">
                        <td className="px-5 py-4">{row.date}</td>
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <div>{row.description}</div>
                            <div className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>
                              {row.translatedDescription}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">{row.amount.toFixed(2)}</td>
                        <td className="px-5 py-4">{row.category ?? 'Uncategorized'}</td>
                        <td className="px-5 py-4">
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                            style={{
                              backgroundColor: '#202020',
                              color: row.confidence >= 0.85 ? '#2ECC71' : row.confidence >= 0.65 ? '#F1C40F' : '#E74C3C',
                            }}
                          >
                            {(row.confidence * 100).toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Showing {confirmedTransactions.length} of {confirmedTotal} transactions
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchConfirmedTransactions(Math.max(1, currentPage - 1), searchQuery, categoryFilter)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#181818', color: 'var(--text-primary)' }}
                >
                  Prev
                </button>
                <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => fetchConfirmedTransactions(Math.min(totalPages, currentPage + 1), searchQuery, categoryFilter)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#181818', color: 'var(--text-primary)' }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

