'use client';

import type { ReactNode } from 'react';
import { Settings, WarningTriangle } from 'iconoir-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import Skeleton from '@/components/ui/Skeleton';
import DimensionPicker from '@/components/statistics/DimensionPicker';
import DemographicComparisonRow from '@/components/statistics/DemographicComparisonRow';
import type { DemographicDimension } from '@/lib/statistics/cohort';
import type { DemographicSection } from '@/hooks/useStatisticsData';
import { formatDecimal } from '@/lib/format';

/**
 * Smallest real cohort we show figures for. The API returns comparisons from a single peer, which
 * would let anyone read that person's numbers off the screen and is not a meaningful average anyway.
 */
const MIN_PEER_COHORT = 10;

interface DemographicComparisonsSectionProps {
  section: DemographicSection | undefined;
  loading?: boolean;
  dimension: DemographicDimension;
  onDimensionChange: (dimension: DemographicDimension) => void;
  error?: string | null;
  onRetry?: () => void;
}

export default function DemographicComparisonsSection({
  section,
  loading = false,
  dimension,
  onDimensionChange,
  error = null,
  onRetry,
}: DemographicComparisonsSectionProps) {
  if (loading || (!section && !error)) {
    return (
      <SectionCard>
        <SectionSkeleton />
      </SectionCard>
    );
  }

  if (error || !section) {
    return (
      <SectionCard>
        <ErrorState message={error ?? undefined} onRetry={onRetry} className="flex-1" />
      </SectionCard>
    );
  }

  if (section.disabled) {
    return (
      <SectionCard>
        <EmptyState
          icon={<Settings width={24} height={24} strokeWidth={1.5} />}
          title="Data sharing is off"
          description="Enable data sharing in Settings to see how you compare to others in your age group, country, or profession."
          action={<Button href="/settings" variant="secondary">Open Settings</Button>}
          className="flex-1"
        />
      </SectionCard>
    );
  }

  const isSynthetic = section.synthetic;
  const cohortTooSmall = !isSynthetic && section.cohortSize < MIN_PEER_COHORT;
  const showRows = section.comparisons.length > 0 && !cohortTooSmall;
  const subtitle = showRows && !isSynthetic ? `Compared with ${formatDecimal(section.cohortSize, { maxDecimals: 0 })} people` : null;

  return (
    <SectionCard subtitle={subtitle}>
      <div className="flex min-h-[280px] flex-1 flex-col gap-4">
        <DimensionPicker value={dimension} onChange={onDimensionChange} />
        {isSynthetic && showRows && <SyntheticBanner />}
        <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
          {showRows ? (
            section.comparisons.map((comparison) => <DemographicComparisonRow key={comparison.id} comparison={comparison} />)
          ) : (
            <p className="py-4 text-center text-body text-secondary text-pretty">{emptyMessage(section, dimension, cohortTooSmall)}</p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function SectionCard({ subtitle, children }: { subtitle?: string | null; children: ReactNode }) {
  return (
    <Card
      title="Demographic Comparisons"
      showActions={false}
      className="flex min-h-0 flex-1 flex-col"
      customHeader={
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-3">
          <h2 className="text-card-header">Demographic Comparisons</h2>
          {subtitle && <span className="text-ui text-secondary tabular-nums">{subtitle}</span>}
        </div>
      }
    >
      {children}
    </Card>
  );
}

/** Shown above generated peers so nobody mistakes them for real users. */
function SyntheticBanner() {
  return (
    <div role="note" className="flex items-start gap-3 rounded-control border border-warning/40 bg-warning/10 p-3 text-ui text-fg">
      <WarningTriangle width={20} height={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
      <p className="text-pretty">
        <span className="font-semibold">Demo data.</span> These peers are generated for illustration and are not real
        users. Do not read them as how people like you actually spend or earn.
      </p>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="flex min-h-[280px] flex-1 flex-col gap-4" aria-busy="true">
      <Skeleton className="h-10 w-full rounded-full" />
      <div className="flex flex-col gap-3 pr-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-card bg-surface-0 px-4 py-3">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const GROUP_NAMES: Record<DemographicDimension, string> = {
  age: 'age group',
  country: 'country',
  profession: 'profession',
};

function emptyMessage(section: DemographicSection, dimension: DemographicDimension, cohortTooSmall: boolean): string {
  const group = GROUP_NAMES[dimension];
  if (section.cohortValueMissing) {
    const field = dimension === 'age' ? 'date of birth' : group;
    return `Add your ${field} in Settings to compare with others in your ${group}.`;
  }
  if (cohortTooSmall && section.cohortSize > 0) {
    const count = formatDecimal(section.cohortSize, { maxDecimals: 0 });
    const people = section.cohortSize === 1 ? 'person' : 'people';
    return `Only ${count} ${people} in your ${group} share data so far. Comparisons appear once at least ${MIN_PEER_COHORT} do, so no one's numbers can be singled out.`;
  }
  return `Not enough people in your ${group} have shared data yet. Check back as more people join.`;
}
