import Card from '@/components/ui/Card';
import { NavArrowRight, Trophy, InfoCircle } from 'iconoir-react';
import Link from 'next/link';
import { FinancialMilestone } from '@/types/dashboard';
import ComingSoonBadge from '@/components/ui/ComingSoonBadge';

const SKELETON_STYLE = { backgroundColor: '#3a3a3a' };

interface FinancialMilestonesCardProps {
  milestone: FinancialMilestone;
  loading?: boolean;
}

export default function FinancialMilestonesCard({ milestone, loading = false }: FinancialMilestonesCardProps) {
  const contentMinHeight = 200;

  if (loading) {
    return (
      <Card
        title="Financial Milestones"
        showActions={false}
        className="flex flex-col shrink-0"
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ minHeight: contentMinHeight }}>
          <div className="p-3 mb-4 rounded-2xl" style={{ backgroundColor: '#202020' }}>
            <div className="h-3 w-16 rounded animate-pulse mb-2" style={SKELETON_STYLE} />
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full shrink-0 animate-pulse" style={SKELETON_STYLE} />
              <div className="h-4 flex-1 max-w-[200px] rounded animate-pulse" style={SKELETON_STYLE} />
            </div>
          </div>
          <div className="h-4 w-28 rounded animate-pulse mb-4" style={SKELETON_STYLE} />
          <div className="flex items-start gap-2 mt-4">
            <div className="w-4 h-4 rounded shrink-0 animate-pulse" style={SKELETON_STYLE} />
            <div className="h-3 flex-1 max-w-[180px] rounded animate-pulse" style={SKELETON_STYLE} />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Financial Milestones"
      className="flex flex-col shrink-0"
      customHeader={
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-card-header">Financial Milestones</h2>
          <ComingSoonBadge />
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0" style={{ filter: 'blur(2px)', minHeight: 200 }}>
        <div className="flex-1 min-h-0">
          <div 
            className="p-3 mb-4"
            style={{
              backgroundColor: '#202020',
              borderRadius: '15px',
            }}
          >
            <div className="text-helper mb-2">{milestone.date}</div>
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ 
                  backgroundColor: 'rgba(163, 102, 203, 0.1)', 
                  marginTop: '2px',
                  border: '1px solid rgba(231, 228, 228, 0.1)'
                }}
              >
                <Trophy
                  width={20}
                  height={20}
                  strokeWidth={1.5}
                  style={{ color: '#E7E4E4' }}
                />
              </div>
              <div className="text-body text-wrap-safe break-words">{milestone.message}</div>
            </div>
          </div>
          <Link 
            href="#" 
            className="text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors flex-wrap mb-4"
          >
            <span className="text-wrap-safe break-words">View Milestones</span>
            <NavArrowRight width={14} height={14} className="stroke-current transition-colors flex-shrink-0" />
          </Link>
        </div>
        <div className="flex items-start gap-2 mt-4 text-sm min-w-0" style={{ color: 'var(--accent-purple)' }}>
          <InfoCircle width={18} height={18} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
          <span className="text-wrap-safe break-words leading-tight">You're on the path to financial freedom!</span>
        </div>
      </div>
    </Card>
  );
}

