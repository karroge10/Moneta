'use client';

import { useRef, useState, type DragEvent } from 'react';
import { Upload, WarningTriangle } from 'iconoir-react';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import { cx } from '@/components/ui/cx';
import type { UploadState } from '@/hooks/transactions/useImportFlow';

interface UploadDropZoneProps {
  uploadState: UploadState;
  isBusy: boolean;
  progressValue: number;
  statusNote: string | null;
  startTime: number | null;
  elapsedSeconds: number;
  processedCount: number | null;
  totalCount: number | null;
  onFile: (file: File) => void;
}

/** PDF drop zone and file picker; shows queue and processing progress while a job runs. */
export default function UploadDropZone({
  uploadState,
  isBusy,
  progressValue,
  statusNote,
  startTime,
  elapsedSeconds,
  processedCount,
  totalCount,
  onFile,
}: UploadDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isBusy && event.dataTransfer.types.includes('Files')) setIsDragOver(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = isBusy ? 'none' : 'copy';
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const outside =
      event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !isBusy) onFile(file);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = '';
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-busy={isBusy}
      aria-live="polite"
      className={cx(
        'flex min-h-80 w-full flex-1 flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed bg-surface-1 px-6 py-10 text-center transition-colors',
        isBusy && 'border-line',
        !isBusy && (isDragOver ? 'border-accent' : 'border-line hover:border-accent'),
      )}
    >
      {isBusy ? (
        <ProgressPanel
          uploadState={uploadState}
          progressValue={progressValue}
          statusNote={statusNote}
          startTime={startTime}
          elapsedSeconds={elapsedSeconds}
          processedCount={processedCount}
          totalCount={totalCount}
        />
      ) : (
        <>
          {uploadState === 'error' && <StatusBadge uploadState={uploadState} />}
          <h3 className="text-heading font-semibold text-fg">Drag & drop your PDF here</h3>
          <p className="max-w-xl text-ui text-secondary text-pretty">
            We accept bank statements in PDF format. Transactions will be parsed automatically so you can review and
            save them in seconds.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button size="lg" onClick={() => fileInputRef.current?.click()}>
              Select PDF
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleInputChange}
              aria-label="Select a PDF bank statement"
            />
            <span className="text-caption text-secondary">PDF only, up to 10 MB</span>
          </div>
        </>
      )}
    </div>
  );
}

type ProgressPanelProps = Omit<UploadDropZoneProps, 'isBusy' | 'onFile'>;

function ProgressPanel({
  uploadState,
  progressValue,
  statusNote,
  startTime,
  elapsedSeconds,
  processedCount,
  totalCount,
}: ProgressPanelProps) {
  const showEstimate = uploadState === 'processing' && elapsedSeconds > 5;
  const remaining = estimateRemaining(elapsedSeconds, processedCount, totalCount);

  return (
    <div className="flex w-full max-w-xl flex-col items-center justify-center gap-5">
      <div className="space-y-2">
        <h3 className="text-heading font-semibold text-fg">Processing your statement</h3>
        <p className="text-ui text-secondary">Hold tight while we parse your PDF. You can review the progress below.</p>
      </div>
      <div className="w-full space-y-3 rounded-card border border-line bg-surface-1 px-6 py-5 text-left">
        <StatusBadge uploadState={uploadState} />
        <ProgressBar value={progressValue} showLabel={false} />
        <div className="space-y-1.5">
          <p className="text-caption text-secondary">{statusNote || 'Processing PDF...'}</p>
          {startTime !== null && (
            <div className="flex items-center gap-3 text-caption text-secondary tabular-nums">
              <span>Elapsed: {formatDuration(elapsedSeconds)}</span>
              {showEstimate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Estimated remaining: {remaining}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL: Partial<Record<UploadState, string>> = {
  queued: 'Queued',
  uploading: 'Uploading',
  processing: 'Processing',
  error: 'Import failed',
};

function StatusBadge({ uploadState }: { uploadState: UploadState }) {
  const label = STATUS_LABEL[uploadState];
  if (!label) return null;
  const isError = uploadState === 'error';
  const showUploadIcon = uploadState === 'uploading' || uploadState === 'processing';

  return (
    <div className={cx('flex items-center gap-2 text-ui font-medium', isError ? 'text-negative-fg' : 'text-fg')}>
      {isError && <WarningTriangle width={16} height={16} strokeWidth={1.5} aria-hidden="true" />}
      {showUploadIcon && <Upload width={16} height={16} strokeWidth={1.5} aria-hidden="true" />}
      <span>{label}</span>
    </div>
  );
}

function estimateRemaining(elapsedSeconds: number, processed: number | null, total: number | null): string {
  if (processed !== null && total !== null && processed > 0 && total > processed) {
    const rate = processed / elapsedSeconds;
    const seconds = Math.ceil((total - processed) / rate);
    return formatDuration(seconds);
  }
  return elapsedSeconds > 0 ? formatDuration(elapsedSeconds * 2) : '-';
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}m ${rest}s`;
}
