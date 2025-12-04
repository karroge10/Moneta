import Card from '@/components/ui/Card';
import PlaceholderDataBadge from '@/components/ui/PlaceholderDataBadge';
import { NavArrowRight } from 'iconoir-react';
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
            <h2 className="text-card-header">Demographic Comparison</h2>
            <PlaceholderDataBadge />
          </div>
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0" style={{ filter: 'blur(2px)' }}>
        <div className="flex-1 min-h-0">
          <div className="text-body mb-4 text-wrap-safe break-words">
            {message.split(percentageLabel).map((part, idx) => (
              <span key={idx}>
                {part}
                {idx === 0 && (
                  <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                    {percentageLabel}
                  </span>
                )}
              </span>
            ))}
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

