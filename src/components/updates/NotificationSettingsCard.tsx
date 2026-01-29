'use client';

import Card from '@/components/ui/Card';
import NotificationSettingsForm from '@/components/updates/NotificationSettingsForm';
import { NotificationSettings } from '@/types/dashboard';

interface NotificationSettingsCardProps {
  settings: NotificationSettings;
  onToggle?: (key: keyof NotificationSettings, enabled: boolean) => void;
}

export default function NotificationSettingsCard({
  settings,
  onToggle,
}: NotificationSettingsCardProps) {
  return (
    <Card title="Settings" showActions={false}>
      <div className="mt-2">
        <NotificationSettingsForm settings={settings} onToggle={onToggle} />
      </div>
    </Card>
  );
}
