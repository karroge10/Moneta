import Card from '@/components/ui/Card';
import { NavArrowRight, Trophy, InfoCircle, Plus } from 'iconoir-react';
import Link from 'next/link';
import { FinancialMilestone } from '@/types/dashboard';
import ComingSoonBadge from '@/components/ui/ComingSoonBadge';

interface FinancialMilestonesCardProps {
  milestone: FinancialMilestone;
}

export default function FinancialMilestonesCard({ milestone }: FinancialMilestonesCardProps) {
  return (
    <Card 
      title="Financial Milestones"
      customHeader={
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-card-header">Financial Milestones</h2>
            <ComingSoonBadge />
          </div>
          <button
            className="hover-text-purple transition-colors cursor-pointer group"
            aria-label="Add milestone"
          >
            <Plus width={20} height={20} strokeWidth={1.5} className="stroke-current" />
          </button>
        </div>
      }
    >
      <div className="flex flex-col flex-1 min-h-0" style={{ filter: 'blur(2px)' }}>
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
                style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)', marginTop: '2px' }}
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

