'use client';

import Card from '@/components/ui/Card';
import ComingSoonBadge from '@/components/ui/ComingSoonBadge';
import { Achievement } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';

const SKELETON_ITEMS = 10; // 2 rows × 5 cols, same as loaded view
const maxHeight = '220px';

interface FinancialMilestonesCardProps {
  achievements: Achievement[];
  loading?: boolean;
}

export default function FinancialMilestonesCard({ achievements, loading = false }: FinancialMilestonesCardProps) {
  if (loading) {
    return (
      <Card title="Financial Milestones" showActions={false}>
        <div
          className="overflow-y-auto custom-scrollbar pr-2"
          style={{ maxHeight }}
        >
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: SKELETON_ITEMS }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className="w-16 h-16 rounded-full shrink-0 animate-pulse"
                  style={{ backgroundColor: '#3a3a3a' }}
                />
                <div className="h-3 w-12 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }} />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Financial Milestones"
      showActions={false}
      customHeader={
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-card-header">Financial Milestones</h2>
          <ComingSoonBadge />
        </div>
      }
    >
      <div
        className="overflow-y-auto custom-scrollbar pr-2 select-none pointer-events-none"
        style={{ maxHeight, filter: 'blur(2px)' }}
      >
        <div className="grid grid-cols-5 gap-4">
          {achievements.map((achievement) => {
            const Icon = getIcon(achievement.icon);
            const isUnlocked = achievement.unlocked;

            return (
              <div key={achievement.id} className="flex flex-col items-center gap-2">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: isUnlocked
                      ? 'rgba(172, 102, 218, 0.3)'
                      : 'rgba(57, 57, 57, 0.5)',
                  }}
                >
                  <Icon
                    width={32}
                    height={32}
                    strokeWidth={1.5}
                    style={{
                      color: isUnlocked ? '#AC66DA' : 'rgba(185, 185, 185, 0.3)',
                    }}
                  />
                </div>
                <span
                  className="text-helper text-center"
                  style={{
                    color: isUnlocked ? '#E7E4E4' : 'rgba(185, 185, 185, 0.5)',
                  }}
                >
                  {achievement.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

