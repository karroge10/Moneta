'use client';

import Card from '@/components/ui/Card';
import SettingsField from './SettingsField';
import { UserSettings } from '@/types/dashboard';
import { User, Mail, Lock } from 'iconoir-react';

interface SecurityDetailsCardProps {
  settings: UserSettings;
  onEdit?: (field: string) => void;
  onChange?: (field: string, value: string) => void;
  onSetup2FA?: () => void;
  onDeleteAccount?: () => void;
}

export default function SecurityDetailsCard({ 
  settings, 
  onEdit,
  onChange,
  onSetup2FA,
  onDeleteAccount
}: SecurityDetailsCardProps) {
  return (
    <Card title="Security Details" showActions={false}>
      <div className="flex flex-col gap-4">
        <SettingsField
          label="Username"
          value={settings.username}
          icon={<User width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
          type="input"
          onEdit={() => onEdit?.('username')}
        />
        <SettingsField
          label="Email"
          value={settings.email}
          icon={<Mail width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
          type="input"
          onEdit={() => onEdit?.('email')}
        />
        <SettingsField
          label="Password"
          value="************"
          icon={<Lock width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
          type="input"
          onEdit={() => onEdit?.('password')}
        />

        {/* Two-Factor Authentication Section */}
        <div className="flex flex-col gap-3 mt-2">
          <div className="text-body" style={{ color: '#E7E4E4' }}>
            Two-Factor Authentication
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onSetup2FA}
              className="px-4 py-2 rounded-full text-body transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#282828', color: '#E7E4E4' }}
            >
              Set up 2FA
            </button>
            <button
              onClick={onDeleteAccount}
              className="px-4 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#D93F3F', color: '#E7E4E4' }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

