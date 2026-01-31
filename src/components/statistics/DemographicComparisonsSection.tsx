'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { NavArrowDown, User, Settings, City, Suitcase } from 'iconoir-react';
import { DemographicComparison } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import type { DemographicDimension } from '@/app/statistics/page';

const SKELETON_STYLE = { backgroundColor: '#3a3a3a' };
const SKELETON_ITEMS = 3;
const DIMENSION_LABELS: Record<DemographicDimension, string> = {
  age: 'By age group',
  country: 'By country',
  profession: 'By profession',
};

const ICON_SIZE = 20;
const OPTION_ROW = 'w-full text-left px-4 py-3 flex items-center gap-3 text-body cursor-pointer transition-colors hover:bg-[#2a2a2a]';

interface DemographicComparisonsSectionProps {
  comparisons: DemographicComparison[];
  loading?: boolean;
  demographicComparisonsDisabled?: boolean;
  demographicCohortValueMissing?: boolean;
  demographicDimension: DemographicDimension;
  onDemographicChange: (dimension: DemographicDimension) => void;
  error?: string | null;
  onRetry?: () => void;
}

export default function DemographicComparisonsSection({
  comparisons,
  loading = false,
  demographicComparisonsDisabled = false,
  demographicCohortValueMissing = false,
  demographicDimension,
  onDemographicChange,
  error = null,
  onRetry,
}: DemographicComparisonsSectionProps) {
  const [dimensionOpen, setDimensionOpen] = useState(false);
  const [dimensionHovered, setDimensionHovered] = useState(false);
  const dimensionRef = useRef<HTMLDivElement>(null);

  const dimensionLabel = DIMENSION_LABELS[demographicDimension];
  const textColor = dimensionHovered ? '#AC66DA' : '#E7E4E4';
  const contentMinHeight = 280;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dimensionRef.current && !dimensionRef.current.contains(target)) {
        setDimensionOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <Card
        title="Demographic Comparisons"
        showActions={false}
        className="flex flex-col min-h-0 flex-1"
      >
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden" style={{ minHeight: contentMinHeight }}>
          <div className="w-full flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: '#202020' }}>
            <div className="w-5 h-5 rounded animate-pulse shrink-0" style={SKELETON_STYLE} />
            <div className="h-5 flex-1 max-w-[140px] rounded animate-pulse" style={SKELETON_STYLE} />
          </div>
          <div className="flex flex-col gap-3 pr-2">
            {Array.from({ length: SKELETON_ITEMS }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-3xl" style={{ backgroundColor: '#202020' }}>
                <div className="w-12 h-12 rounded-full shrink-0 animate-pulse" style={SKELETON_STYLE} />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 w-24 rounded animate-pulse" style={SKELETON_STYLE} />
                  <div className="h-4 w-32 rounded animate-pulse" style={SKELETON_STYLE} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const header = (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="text-card-header">Demographic Comparisons</h2>
    </div>
  );

  if (demographicComparisonsDisabled) {
    return (
      <Card
        title="Demographic Comparisons"
        customHeader={header}
        showActions={false}
        className="flex flex-col min-h-0 flex-1"
      >
        <div
          className="flex flex-col gap-4 flex-1 min-h-0 items-center justify-center p-6 text-center"
          style={{ minHeight: contentMinHeight }}
        >
          <p className="text-body" style={{ color: 'rgba(231, 228, 228, 0.7)' }}>
            Enable data sharing in Settings to see how you compare to others in your age group, country, or profession.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-body transition-colors"
            style={{ backgroundColor: '#E7E4E4', color: '#282828' }}
          >
            <Settings width={18} height={18} strokeWidth={1.5} />
            Open Settings
          </Link>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        title="Demographic Comparisons"
        customHeader={header}
        showActions={false}
        className="flex flex-col min-h-0 flex-1"
      >
        <div
          className="flex flex-col gap-4 flex-1 min-h-0 items-center justify-center p-6 text-center"
          style={{ minHeight: contentMinHeight }}
        >
          <p className="text-body" style={{ color: 'rgba(231, 228, 228, 0.7)' }}>
            {error}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-body transition-colors"
              style={{ backgroundColor: '#E7E4E4', color: '#282828' }}
            >
              Try again
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Demographic Comparisons"
      customHeader={header}
      showActions={false}
      className="flex flex-col min-h-0 flex-1"
    >
      <div className="flex flex-col gap-4 flex-1 min-h-0" style={{ minHeight: contentMinHeight }}>
        <div className="mb-2 w-full">
          <div className="relative w-full" ref={dimensionRef}>
            <button
              type="button"
              onClick={() => setDimensionOpen(!dimensionOpen)}
              onMouseEnter={() => setDimensionHovered(true)}
              onMouseLeave={() => setDimensionHovered(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-colors duration-150 cursor-pointer w-full justify-between text-body"
              style={{ backgroundColor: '#202020', color: textColor, transitionProperty: 'color' }}
            >
              <div className="flex items-center gap-2">
                {demographicDimension === 'age' && <User width={ICON_SIZE} height={ICON_SIZE} strokeWidth={1.5} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />}
                {demographicDimension === 'country' && <City width={ICON_SIZE} height={ICON_SIZE} strokeWidth={1.5} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />}
                {demographicDimension === 'profession' && <Suitcase width={ICON_SIZE} height={ICON_SIZE} strokeWidth={1.5} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />}
                <span className="font-semibold" style={{ transition: 'color 150ms ease-in-out' }}>{dimensionLabel}</span>
              </div>
              <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: textColor, transition: 'color 150ms ease-in-out' }} />
            </button>
            {dimensionOpen && (
              <div className="absolute top-full mt-2 left-0 right-0 min-w-[200px] rounded-2xl shadow-lg overflow-hidden z-10" style={{ backgroundColor: '#202020' }}>
                {(['age', 'country', 'profession'] as const).map((dim) => {
                  const isSelected = demographicDimension === dim;
                  const Icon = dim === 'age' ? User : dim === 'country' ? City : Suitcase;
                  return (
                    <button
                      key={dim}
                      type="button"
                      onClick={() => {
                        onDemographicChange(dim);
                        setDimensionOpen(false);
                      }}
                      className={OPTION_ROW}
                      style={{ backgroundColor: 'transparent', color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' }}
                    >
                      <Icon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={1.5} style={{ color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)', flexShrink: 0 }} />
                      <span>{DIMENSION_LABELS[dim]}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 pr-2">
          {comparisons.length === 0 ? (
            <p className="text-body text-center py-4" style={{ color: 'var(--text-secondary)' }}>
              {demographicCohortValueMissing
                ? demographicDimension === 'age'
                  ? 'Add your date of birth in Settings to compare with others in your age group.'
                  : demographicDimension === 'country'
                    ? 'Add your country in Settings to compare with others in your country.'
                    : 'Add your profession in Settings to compare with others in your profession.'
                : `Not enough people in your ${demographicDimension === 'age' ? 'age group' : demographicDimension === 'country' ? 'country' : 'profession'} have shared data yet. Check back as more people join.`}
            </p>
          ) : (
            comparisons.map((comparison) => {
              const Icon = getIcon(comparison.icon);
              const comp = comparison.comparison;
              const isHigher = comp.includes('higher');
              const isLower = comp.includes('lower');
              const numberPart = isHigher
                ? comp.slice(0, comp.indexOf(' higher than others'))
                : isLower
                  ? comp.slice(0, comp.indexOf(' lower than others'))
                  : '';
              const labelPart = isHigher
                ? ' higher than others'
                : isLower
                  ? ' lower than others'
                  : comp;
              const trendColor = isHigher ? '#74C648' : isLower ? '#D93F3F' : 'var(--text-secondary)';

              return (
                <div
                  key={comparison.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    backgroundColor: '#202020',
                    borderRadius: '30px',
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${comparison.iconColor}1a` }}
                  >
                    <Icon width={24} height={24} strokeWidth={1.5} style={{ color: comparison.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body font-medium text-wrap-safe wrap-break-word">{comparison.label}</div>
                    <div className="flex items-center gap-2 mt-1 text-wrap-safe wrap-break-word">
                      <span>
                        {numberPart ? (
                          <>
                            <span style={{ color: trendColor, fontWeight: 600 }}>{numberPart}</span>
                            <span className="text-helper">{labelPart}</span>
                          </>
                        ) : (
                          <span className="text-helper">{labelPart}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}
