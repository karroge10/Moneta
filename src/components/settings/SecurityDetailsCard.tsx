'use client';

import { Mail, Lock, Trash } from 'iconoir-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import type { UserSettings } from '@/types/dashboard';

interface SecurityDetailsCardProps {
  settings: UserSettings;
  /** Opens the Clerk profile, where email and password are changed. */
  onOpenAccountProfile?: () => void;
  onDeleteAccount?: () => void;
  loading?: boolean;
}

export default function SecurityDetailsCard({
  settings,
  onOpenAccountProfile,
  onDeleteAccount,
  loading = false,
}: SecurityDetailsCardProps) {
  if (loading) {
    return (
      <Card title="Security Details" showActions={false}>
        <div className="flex flex-col gap-4" aria-busy="true">
          <span className="sr-only">Loading security details</span>
          {['w-12', 'w-20'].map((labelWidth) => (
            <div key={labelWidth} className="flex flex-col gap-2">
              <Skeleton className={`h-4 ${labelWidth}`} />
              <Skeleton className="h-10 w-full rounded-control" />
            </div>
          ))}
          <Skeleton className="mt-2 h-10 w-40 rounded-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Security Details" showActions={false}>
      <dl className="flex flex-col gap-4">
        <SecurityRow
          label="Email"
          icon={<Mail width={20} height={20} strokeWidth={1.5} />}
          value={settings.email || <span className="text-muted">No email set</span>}
          actionLabel="Change email"
          onAction={onOpenAccountProfile}
        />
        <SecurityRow
          label="Password"
          icon={<Lock width={20} height={20} strokeWidth={1.5} />}
          value={
            <>
              <span aria-hidden="true">••••••••••••</span>
              <span className="sr-only">Hidden</span>
            </>
          }
          actionLabel="Change password"
          onAction={onOpenAccountProfile}
        />
      </dl>

      {onDeleteAccount && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="danger"
            onClick={onDeleteAccount}
            icon={<Trash width={18} height={18} strokeWidth={1.5} aria-hidden="true" />}
          >
            Delete account
          </Button>
        </div>
      )}
    </Card>
  );
}

function SecurityRow({
  label,
  icon,
  value,
  actionLabel,
  onAction,
}: {
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="text-ui font-medium text-secondary">{label}</dt>
      <dd className="flex min-h-10 items-center gap-3 rounded-control border border-line bg-surface-0 px-4 py-2 text-secondary">
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-copy">{value}</span>
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 rounded-chip text-ui font-semibold text-accent-fg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent"
          >
            {actionLabel}
          </button>
        )}
      </dd>
    </div>
  );
}
