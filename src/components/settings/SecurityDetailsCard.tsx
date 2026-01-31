'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import SettingsField from './SettingsField';
import { UserSettings } from '@/types/dashboard';
import { User, Mail, Lock } from 'iconoir-react';

const SKELETON_STYLE = { backgroundColor: '#3a3a3a' };

function FieldRowSkeleton({ labelWidth = 'w-24' }: { labelWidth?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-4 rounded animate-pulse ${labelWidth}`} style={SKELETON_STYLE} />
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: '#202020' }}>
        <div className="w-5 h-5 rounded shrink-0 animate-pulse" style={SKELETON_STYLE} />
        <div className="h-4 flex-1 min-w-0 rounded animate-pulse max-w-[180px]" style={SKELETON_STYLE} />
      </div>
    </div>
  );
}

interface SecurityDetailsCardProps {
  settings: UserSettings;
  onEdit?: (field: string) => void;
  onChange?: (field: string, value: string) => void;
  onOpenAccountProfile?: () => void;
  onDeleteAccount?: () => void;
  loading?: boolean;
  /** When true, fields are disabled (e.g. while saving). */
  disabled?: boolean;
  /** Error message from username update (e.g. "Username is already taken"). */
  usernameError?: string | null;
}

export default function SecurityDetailsCard({
  settings,
  onEdit,
  onChange,
  onOpenAccountProfile,
  onDeleteAccount,
  loading = false,
  disabled = false,
  usernameError = null,
}: SecurityDetailsCardProps) {
  const openProfile = onOpenAccountProfile;
  // Username: only reflect saved value from server; local state for typing, synced on success or error
  const [usernameInput, setUsernameInput] = useState(settings.username);
  useEffect(() => {
    setUsernameInput(settings.username);
  }, [settings.username]);
  useEffect(() => {
    if (usernameError) setUsernameInput(settings.username);
  }, [usernameError, settings.username]);

  if (loading) {
    return (
      <Card title="Security Details" showActions={false}>
        <div className="flex flex-col gap-4">
          <FieldRowSkeleton labelWidth="w-20" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-12 rounded animate-pulse" style={SKELETON_STYLE} />
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: '#202020' }}>
              <div className="w-5 h-5 rounded shrink-0 animate-pulse" style={SKELETON_STYLE} />
              <div className="h-4 flex-1 max-w-[200px] rounded animate-pulse" style={SKELETON_STYLE} />
              <div className="h-4 w-24 rounded animate-pulse" style={SKELETON_STYLE} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-4 w-20 rounded animate-pulse" style={SKELETON_STYLE} />
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: '#202020' }}>
              <div className="w-5 h-5 rounded shrink-0 animate-pulse" style={SKELETON_STYLE} />
              <div className="h-4 flex-1 max-w-[120px] rounded animate-pulse" style={SKELETON_STYLE} />
              <div className="h-4 w-28 rounded animate-pulse" style={SKELETON_STYLE} />
            </div>
          </div>
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="h-9 w-32 rounded-full animate-pulse" style={SKELETON_STYLE} />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Security Details" showActions={false}>
      <div className="flex flex-col gap-4">
        <SettingsField
          label="Username"
          value={usernameInput}
          icon={<User width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
          type="input"
          placeholder="Username"
          disabled={disabled}
          onChange={(value) => {
            setUsernameInput(value);
            onChange?.('username', value);
          }}
        />
        {usernameError ? (
          <p className="text-helper" style={{ color: 'var(--error)' }}>
            {usernameError}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <label className="text-body" style={{ color: '#E7E4E4' }}>
            Email
          </label>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: '#202020', color: '#B9B9B9' }}>
            <Mail width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />
            <span className="flex-1 text-body" style={{ color: settings.email ? undefined : 'rgba(231, 228, 228, 0.5)' }}>
              {settings.email || 'No email set'}
            </span>
            {openProfile && (
              <button
                type="button"
                onClick={openProfile}
                className="text-body font-semibold transition-opacity hover:opacity-90 cursor-pointer"
                style={{ color: 'var(--accent-purple)' }}
              >
                Change email
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-body" style={{ color: '#E7E4E4' }}>
            Password
          </label>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: '#202020', color: '#B9B9B9' }}>
            <Lock width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />
            <span className="flex-1 text-body">••••••••••••</span>
            {openProfile && (
              <button
                type="button"
                onClick={openProfile}
                className="text-body font-semibold transition-opacity hover:opacity-90 cursor-pointer"
                style={{ color: 'var(--accent-purple)' }}
              >
                Change password
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-2">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={onDeleteAccount}
              className="px-4 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90 cursor-pointer"
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

