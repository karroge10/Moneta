import type { DemographicComparison } from '@/types/dashboard';
import ChangeText from '@/components/statistics/ChangeText';
import NamedIcon from '@/components/dashboard/NamedIcon';

/** One metric compared with the cohort average, e.g. "Income: +12% higher than other users". */
export default function DemographicComparisonRow({ comparison }: { comparison: DemographicComparison }) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface-0 px-4 py-3">
      <span
        className="icon-circle size-12 shrink-0 border border-line-subtle"
        style={{ backgroundColor: `color-mix(in oklch, ${comparison.iconColor} 10%, transparent)` }}
        aria-hidden="true"
      >
        <NamedIcon name={comparison.icon} width={24} height={24} strokeWidth={1.5} style={{ color: comparison.iconColor }} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-wrap-safe wrap-break-word text-body font-medium">{comparison.label}</div>
        <div className="mt-1">
          {comparison.change == null ? (
            <span className="text-ui text-secondary">Same as other users</span>
          ) : (
            <ChangeText change={comparison.change} invert={comparison.invertChangeColor} />
          )}
        </div>
      </div>
    </div>
  );
}
