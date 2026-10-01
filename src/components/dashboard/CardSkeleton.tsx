'use client';

import type { ReactElement } from 'react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

export type CardSkeletonVariant = 'value' | 'list' | 'chart' | 'goal' | 'health' | 'update' | 'table' | 'donut';

interface CardSkeletonProps {
  title: string;
  variant?: CardSkeletonVariant;
  className?: string;
}

/** Card with its real title and a placeholder body shaped like the content that will load. */
export default function CardSkeleton({ title, variant = 'value', className }: CardSkeletonProps) {
  const body = BODIES[variant]();
  return (
    <Card title={title} showActions={false} className={className}>
      <div className="mt-2 flex min-h-0 flex-1 flex-col" aria-busy="true">
        {body}
      </div>
    </Card>
  );
}

const CHART_BARS = [40, 70, 45, 90, 65, 80, 50, 95, 60, 85, 40, 70, 45, 90, 65];

function ValueBody() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-12 w-32" />
      </div>
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

function ListBody() {
  return (
    <div className="flex-1 space-y-6 overflow-hidden">
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function ChartBody() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-6 flex min-h-[200px] flex-1 items-end gap-2 border-b border-line pb-2">
        {CHART_BARS.map((height, i) => (
          <div key={i} className="flex-1 animate-pulse rounded-t-chip bg-surface-3" style={{ height: `${height}%` }} />
        ))}
      </div>
      <div className="flex shrink-0 justify-between">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

function TableBody() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex gap-4 border-b border-line pb-3">
        <Skeleton className="h-3 w-[35%]" />
        <Skeleton className="h-3 flex-1" />
        <Skeleton className="h-3 flex-1" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="flex w-[35%] items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutBody() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center">
      <div className="mb-6 size-44 shrink-0 animate-pulse rounded-full border-[16px] border-surface-3" />
      <div className="w-full flex-1 space-y-4 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalBody() {
  return (
    <>
      <Skeleton className="mb-2 h-3 w-24" />
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <Skeleton className="h-4 w-32 flex-1" />
        <Skeleton className="h-4 w-20 shrink-0" />
      </div>
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <Skeleton className="size-8" />
        <Skeleton className="h-12 w-32" />
      </div>
      <Skeleton className="mb-4 h-2 w-full rounded-full" />
      <Skeleton className="mb-6 h-3 w-full" />
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="size-2 rounded-full" />
        ))}
      </div>
    </>
  );
}

function HealthBody() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <Skeleton className="mb-4 size-24 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

function UpdateBody() {
  return (
    <>
      <Skeleton className="mb-4 h-3 w-20" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-4 h-4 w-3/4" />
      <Skeleton className="h-4 w-24" />
    </>
  );
}

const BODIES: Record<CardSkeletonVariant, () => ReactElement> = {
  value: ValueBody,
  list: ListBody,
  chart: ChartBody,
  table: TableBody,
  donut: DonutBody,
  goal: GoalBody,
  health: HealthBody,
  update: UpdateBody,
};
