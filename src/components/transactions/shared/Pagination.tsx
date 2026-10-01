'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/** Prev / "Page [n] of N" / Next. The page box commits on Enter or blur and resets when out of range. */
export default function Pagination({ page, totalPages, onPageChange, disabled = false }: PaginationProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const lastPage = Math.max(1, totalPages);

  const commitDraft = () => {
    if (draft === null) return;
    const next = Number.parseInt(draft, 10);
    setDraft(null);
    if (Number.isNaN(next) || next < 1 || next > lastPage || next === page) return;
    onPageChange(next);
  };

  return (
    <nav aria-label="Pagination" className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={disabled || page <= 1}
      >
        Prev
      </Button>
      <label className="flex items-center gap-2 text-caption text-fg">
        Page
        <input
          type="number"
          min={1}
          max={lastPage}
          value={draft ?? String(page)}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitDraft();
          }}
          onBlur={commitDraft}
          className="h-8 w-16 rounded-full border border-line bg-surface-inset px-3 text-center text-base font-semibold tabular-nums text-fg sm:text-caption"
        />
        <span className="tabular-nums">of {lastPage}</span>
      </label>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={disabled || page >= lastPage}
      >
        Next
      </Button>
    </nav>
  );
}
