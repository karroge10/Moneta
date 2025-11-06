'use client';

import Card from '@/components/ui/Card';
import { Achievement } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';

interface FinancialMilestonesCardProps {
  achievements: Achievement[];
}

export default function FinancialMilestonesCard({ achievements }: FinancialMilestonesCardProps) {
  // Calculate max height to show exactly 2 rows (5 items per row = 10 items visible)
  // Each item: ~80px (icon circle ~60px + name ~20px + gap)
  // 2 rows: 2 * 80px = 160px
  const maxHeight = '160px';

  return (
    <Card title="Financial Milestones" showActions={false}>
      <div 
        className="overflow-y-auto custom-scrollbar pr-2"
        style={{ maxHeight }}
      >
        <div className="grid grid-cols-5 gap-4">
          {achievements.map((achievement) => {
            const Icon = getIcon(achievement.icon);
            const isUnlocked = achievement.unlocked;
            
            return (
              <div key={achievement.id} className="flex flex-col items-center gap-2">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
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
                      color: isUnlocked ? '#AC66DA' : 'rgba(185, 185, 185, 0.3)'
                    }}
                  />
                </div>
                <span
                  className="text-helper text-center"
                  style={{ 
                    color: isUnlocked ? '#E7E4E4' : 'rgba(185, 185, 185, 0.5)'
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

