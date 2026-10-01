'use client';

import { formatDate } from '@/lib/format';

/** Legacy wrapper: "Mar 5th 2026". Prefer formatDate(value, 'ordinal') from '@/lib/format'. Invalid input is returned unchanged. */
export function formatDateForDisplay(value: string): string {
  if (!value) return '';
  const formatted = formatDate(value, 'ordinal');
  return formatted || value;
}

/** Legacy wrapper: "2026-03-05". Prefer formatDate(value, 'input') from '@/lib/format'. */
export function formatDateToInput(value: string): string {
  return formatDate(value, 'input');
}
