import Card from '@/components/ui/Card';
import { InvestmentActivity } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';

interface RecentActivitiesCardProps {
  activities: InvestmentActivity[];
}

export default function RecentActivitiesCard({ activities }: RecentActivitiesCardProps) {
  if (activities.length === 0) {
    return (
      <Card title="Recent Activities">
        <div className="flex flex-col flex-1 mt-2 justify-center items-center py-8">
          <div className="text-body text-center mb-2 opacity-70">No recent activities</div>
          <div className="text-helper text-center">Investment transactions will appear here</div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Recent Activities">
      <div className="flex flex-col flex-1 mt-2 min-h-0">
        <div className="space-y-4 flex-1 overflow-y-auto pr-4 scroll-list-activities">
          {activities.map((activity) => {
            const Icon = getIcon(activity.icon);
            const changeColor = activity.changeType === 'positive' ? 'var(--accent-green)' : 'var(--error)';
            
            return (
              <div key={activity.id} className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                  >
                    <Icon width={24} height={24} strokeWidth={1.5} style={{ color: '#E7E4E4' }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-body font-medium text-wrap-safe">{activity.assetName}</div>
                  <div className="text-helper text-wrap-safe">{activity.date}</div>
                </div>
                <div className="text-body font-semibold flex-shrink-0 whitespace-nowrap" style={{ color: changeColor }}>
                  {activity.change}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

