'use client';

import { useId, useState } from 'react';
import { User, Suitcase, Pin, Cash, Calendar } from 'iconoir-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { inputClass } from '@/components/ui/Field';
import SettingsField, { type SelectOptionItem } from './SettingsField';
import Switch from './Switch';
import type { UserSettings } from '@/types/dashboard';
import { COUNTRIES } from '@/lib/countries';
import { buildCurrencyTypeaheadOptions } from '@/lib/currency-country-map';

interface PersonalInformationCardProps {
  settings: UserSettings;
  onChange?: (field: string, value: string) => void;
  incomeTaxRate?: number | null;
  onTaxUpdate?: (incomeTaxRate: number | null) => void;
  currencyOptions?: { id: number; name: string; symbol: string; alias: string }[];
  userImageUrl?: string | null;
  onOpenAccountProfile?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const COUNTRY_OPTION_ITEMS: SelectOptionItem[] = COUNTRIES.map((c) => ({
  value: c.name,
  label: c.name,
  countryCode: c.code,
  searchTerms: [c.name, c.code],
}));

export default function PersonalInformationCard({
  settings,
  onChange,
  incomeTaxRate = null,
  onTaxUpdate,
  currencyOptions,
  userImageUrl = null,
  onOpenAccountProfile,
  loading = false,
  disabled = false,
  className = '',
}: PersonalInformationCardProps) {
  if (loading) {
    return (
      <Card title="Personal Information" showActions={false} className={className}>
        <PersonalInformationSkeleton />
      </Card>
    );
  }

  const currencyOptionItems = buildCurrencyOptions(currencyOptions, settings.currency);
  const subtitle = [settings.jobPosition, settings.age ? `${settings.age} years old` : ''].filter(Boolean).join(' | ');

  return (
    <Card title="Personal Information" showActions={false} className={className}>
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <Avatar imageUrl={userImageUrl} onClick={onOpenAccountProfile} />
          <div className="flex flex-1 flex-col gap-2">
            {onOpenAccountProfile ? (
              <button
                type="button"
                onClick={onOpenAccountProfile}
                className="w-fit rounded-chip text-left transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <NameLine name={settings.name} emptyText="Add your name in your profile" />
                <span className="sr-only"> (edit profile)</span>
              </button>
            ) : (
              <NameLine name={settings.name} emptyText="No name set" />
            )}
            {subtitle && (
              <div className="flex items-center gap-2 text-copy text-secondary">
                <Suitcase width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
                <span>{subtitle}</span>
              </div>
            )}
            {settings.country && (
              <div className="flex items-center gap-2 text-copy text-secondary">
                <Pin width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
                <span>{settings.country}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SettingsField
            label="Country"
            value={settings.country}
            icon={<Pin width={20} height={20} strokeWidth={1.5} />}
            type="typeahead"
            optionItems={COUNTRY_OPTION_ITEMS}
            placeholder="Select country"
            searchPlaceholder="Search countries..."
            dropdownInPortal
            disabled={disabled}
            onChange={(value) => onChange?.('country', value)}
          />
          <SettingsField
            label="Currency"
            value={settings.currency}
            icon={<Cash width={20} height={20} strokeWidth={1.5} />}
            type="typeahead"
            optionItems={currencyOptionItems}
            placeholder="Select currency"
            searchPlaceholder="Search currencies (e.g. United States, USD)..."
            dropdownInPortal
            disabled={disabled}
            onChange={(value) => onChange?.('currency', value)}
          />
          <SettingsField
            label="Date of Birth"
            value={settings.dateOfBirth}
            icon={<Calendar width={20} height={20} strokeWidth={1.5} />}
            type="date"
            placeholder="Select date"
            disabled={disabled}
            onChange={(value) => onChange?.('dateOfBirth', value)}
          />
          <SettingsField
            label="Profession"
            value={settings.profession}
            icon={<Suitcase width={20} height={20} strokeWidth={1.5} />}
            type="input"
            placeholder="e.g. Developer"
            disabled={disabled}
            onChange={(value) => onChange?.('profession', value)}
          />
        </div>

        {onTaxUpdate && <TaxEstimation incomeTaxRate={incomeTaxRate} onTaxUpdate={onTaxUpdate} disabled={disabled} />}
      </div>
    </Card>
  );
}

function TaxEstimation({
  incomeTaxRate,
  onTaxUpdate,
  disabled,
}: {
  incomeTaxRate: number | null;
  onTaxUpdate: (incomeTaxRate: number | null) => void;
  disabled: boolean;
}) {
  const labelId = useId();
  const inputId = useId();
  const hintId = useId();
  // null while not editing, so the input shows the saved rate otherwise.
  const [draft, setDraft] = useState<string | null>(null);
  const taxEnabled = incomeTaxRate !== null;
  const shownValue = draft ?? (incomeTaxRate !== null ? String(incomeTaxRate) : '');

  const handleBlur = () => {
    if (draft === null) return;
    const nextRate = clampRate(draft);
    setDraft(null);
    if (nextRate !== incomeTaxRate) onTaxUpdate(nextRate);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span id={labelId} className="text-copy text-fg">
          Enable tax estimation
        </span>
        <Switch
          checked={taxEnabled}
          onChange={(checked) => onTaxUpdate(checked ? 0 : null)}
          disabled={disabled}
          labelledBy={labelId}
        />
      </div>
      {taxEnabled && (
        <div className="flex flex-col gap-2">
          <label htmlFor={inputId} className="text-ui font-medium text-secondary">
            Income tax rate (%)
          </label>
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.1}
            value={shownValue}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            aria-describedby={hintId}
            className={`${inputClass} tabular-nums`}
          />
          <p id={hintId} className="text-caption text-muted">
            Your estimated income tax rate, from 0 to 100%. Used to show estimated tax on the Income page.
          </p>
        </div>
      )}
    </div>
  );
}

function Avatar({ imageUrl, onClick }: { imageUrl: string | null; onClick?: () => void }) {
  const content = imageUrl ? (
    // Clerk avatar URL from an external host; a plain img avoids adding it to next/image remotePatterns.
    <img src={imageUrl} alt="" className="pointer-events-none size-full object-cover" />
  ) : (
    <User width={40} height={40} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
  );
  const shellClass = 'flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/20';

  if (!onClick) return <div className={shellClass}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Change profile photo"
      className={`${shellClass} transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
    >
      {content}
    </button>
  );
}

function NameLine({ name, emptyText }: { name: string; emptyText: string }) {
  return (
    <span className="flex items-center gap-2">
      <User width={18} height={18} strokeWidth={1.5} className="text-secondary" aria-hidden="true" />
      <span className="text-copy font-semibold text-fg">{name || <span className="text-muted">{emptyText}</span>}</span>
    </span>
  );
}

function PersonalInformationSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only">Loading personal information</span>
      <div className="flex items-start gap-4">
        <Skeleton className="size-20 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {['w-16', 'w-20', 'w-24', 'w-24'].map((labelWidth, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className={`h-4 ${labelWidth}`} />
            <Skeleton className="h-10 w-full rounded-control" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
  );
}

function buildCurrencyOptions(
  currencyOptions: PersonalInformationCardProps['currencyOptions'],
  currentCurrency: string,
): SelectOptionItem[] {
  if (currencyOptions?.length) {
    return buildCurrencyTypeaheadOptions(currencyOptions, 'display') as SelectOptionItem[];
  }
  if (!currentCurrency) return [];
  const [symbol = '', alias = currentCurrency] = currentCurrency.split(' ');
  return [{ value: currentCurrency, label: currentCurrency, symbol, alias }];
}

/** Parses the tax input and keeps it within 0..100; empty or invalid input becomes 0. */
function clampRate(raw: string): number {
  const num = Number(raw);
  if (raw.trim() === '' || Number.isNaN(num) || num < 0) return 0;
  return Math.min(num, 100);
}
