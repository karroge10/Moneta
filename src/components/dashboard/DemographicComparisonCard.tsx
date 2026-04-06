import Card from '@/components/ui/Card';

import { NavArrowRight, Neighbourhood } from 'iconoir-react';
import Link from 'next/link';

interface DemographicComparisonCardProps {
  message: string;
  percentage: number;
  percentageLabel: string;
  link: string;
  linkHref?: string;
}

export default function DemographicComparisonCard({ 
  message, 
  percentage, 
  percentageLabel,
  link,
  linkHref
}: DemographicComparisonCardProps) {
  return (
    <Card 
      title="Demographic Comparison"
      customHeader={
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="icon-circle w-10 h-10" 
              style={{ backgroundColor: 'rgba(172, 102, 218, 0.1)', borderColor: 'rgba(231, 228, 228, 0.1)' }}
            >
              <Neighbourhood width={20} height={20} style={{ color: 'var(--accent-purple)' }} />
            </div>
            <h2 className="text-card-header">Demographic Comparison</h2>
          </div>
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0">
          <div className="text-body mb-6 text-wrap-safe break-words leading-relaxed text-secondary">
            {!percentageLabel ? (
              message
            ) : (
              message.split(percentageLabel).map((part, idx) => (
                <span key={idx}>
                  {part}
                  {idx === 0 && (
                    <span className="font-bold inline-flex items-center mx-1" style={{ color: percentage > 0 ? (message.includes('higher') ? 'var(--accent-green)' : 'var(--accent-purple)') : 'var(--text-primary)' }}>
                      {percentageLabel}
                    </span>
                  )}
                </span>
              ))
            )}
          </div>
        </div>
        {linkHref ? (
          <Link href={linkHref} className="text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors flex-wrap">
            <span className="text-wrap-safe break-words">{link}</span> <NavArrowRight width={14} height={14} className="stroke-current transition-colors flex-shrink-0" />
          </Link>
        ) : (
          <div className="text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors flex-wrap">
            <span className="text-wrap-safe break-words">{link}</span> <NavArrowRight width={14} height={14} className="stroke-current transition-colors flex-shrink-0" />
          </div>
        )}
      </div>
    </Card>
  );
}

