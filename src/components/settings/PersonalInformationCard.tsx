'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import SettingsField from './SettingsField';
import { UserSettings } from '@/types/dashboard';
import {
  User,
  Suitcase,
  Pin,
  Globe,
  Cash,
  Calendar,
  HomeSimpleDoor,
  Crown,
} from 'iconoir-react';

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

interface PersonalInformationCardProps {
  settings: UserSettings;
  onEdit?: (field: string) => void;
  onChange?: (field: string, value: string) => void;
  incomeTaxRate?: number | null;
  onTaxUpdate?: (incomeTaxRate: number | null) => void;
  languageOptions?: { id: number; name: string }[];
  currencyOptions?: { id: number; symbol: string; alias: string }[];
  userImageUrl?: string | null;
  loading?: boolean;
}

export default function PersonalInformationCard({
  settings,
  onEdit,
  onChange,
  incomeTaxRate = null,
  onTaxUpdate,
  languageOptions: languageOptionsProp,
  currencyOptions: currencyOptionsProp,
  userImageUrl = null,
  loading = false,
}: PersonalInformationCardProps) {
  const languageOptions = languageOptionsProp?.length
    ? languageOptionsProp.map((l) => l.name)
    : [settings.language].filter(Boolean);
  const currencyOptions = currencyOptionsProp?.length
    ? currencyOptionsProp.map((c) => `${c.symbol} ${c.alias}`)
    : [settings.currency].filter(Boolean);
  const defaultPageOptions = ['Dashboard', 'Statistics', 'Transactions', 'Goals', 'Investments'];

  const taxEnabled = incomeTaxRate !== null;
  const [taxRateInput, setTaxRateInput] = useState(
    incomeTaxRate !== null ? String(incomeTaxRate) : ''
  );
  useEffect(() => {
    if (incomeTaxRate !== null) {
      setTaxRateInput(String(incomeTaxRate));
    } else {
      setTaxRateInput('');
    }
  }, [incomeTaxRate]);

  const handleTaxToggle = () => {
    if (taxEnabled) {
      onTaxUpdate?.(null);
    } else {
      onTaxUpdate?.(0);
    }
  };

  const handleTaxBlur = () => {
    if (taxRateInput === '') {
      if (taxEnabled) {
        onTaxUpdate?.(0);
        setTaxRateInput('0');
      }
      return;
    }
    const num = Number(taxRateInput);
    if (Number.isNaN(num) || num < 0) {
      onTaxUpdate?.(0);
      setTaxRateInput('0');
    } else if (num > 100) {
      onTaxUpdate?.(100);
      setTaxRateInput('100');
    } else {
      onTaxUpdate?.(num);
    }
  };

  if (loading) {
    return (
      <Card title="Personal Information" showActions={false}>
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full shrink-0 animate-pulse" style={SKELETON_STYLE} />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-4 w-32 rounded animate-pulse" style={SKELETON_STYLE} />
              <div className="h-4 w-24 rounded animate-pulse" style={SKELETON_STYLE} />
              <div className="h-4 w-40 rounded animate-pulse" style={SKELETON_STYLE} />
              <div className="h-4 w-28 rounded animate-pulse" style={SKELETON_STYLE} />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <FieldRowSkeleton labelWidth="w-16" />
            <FieldRowSkeleton labelWidth="w-20" />
            <FieldRowSkeleton labelWidth="w-20" />
            <FieldRowSkeleton labelWidth="w-24" />
            <FieldRowSkeleton labelWidth="w-20" />
            <FieldRowSkeleton labelWidth="w-24" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="h-4 w-40 rounded animate-pulse" style={SKELETON_STYLE} />
              <div className="relative w-12 h-6 rounded-full shrink-0 animate-pulse" style={SKELETON_STYLE} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg w-full" style={{ backgroundColor: '#202020' }}>
                <div className="h-4 flex-1 rounded animate-pulse" style={SKELETON_STYLE} />
              </div>
              <div className="h-3 w-full max-w-[280px] rounded animate-pulse" style={SKELETON_STYLE} />
            </div>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            <div className="h-4 w-24 rounded animate-pulse" style={SKELETON_STYLE} />
            <div className="flex items-center gap-3">
              <div className="h-9 w-28 rounded-full animate-pulse" style={SKELETON_STYLE} />
              <div className="h-9 w-36 rounded-full animate-pulse" style={SKELETON_STYLE} />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Personal Information" showActions={false}>
      <div className="flex flex-col gap-6">
        {/* Profile Section */}
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: 'rgba(163, 102, 203, 0.2)' }}
            >
              {userImageUrl ? (
                <img
                  src={userImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <User
                  width={40}
                  height={40}
                  strokeWidth={1.5}
                  style={{ color: '#AC66DA' }}
                />
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-body font-semibold" style={{ color: '#E7E4E4' }}>
              {settings.name}
            </span>
            <div className="flex items-center gap-2 text-body" style={{ color: '#B9B9B9' }}>
              <User width={18} height={18} strokeWidth={1.5} />
              <span>{settings.username}</span>
            </div>
            {(settings.jobPosition || settings.age) ? (
              <div className="flex items-center gap-2 text-body" style={{ color: '#B9B9B9' }}>
                <Suitcase width={18} height={18} strokeWidth={1.5} />
                <span>
                  {[settings.jobPosition, settings.age ? `${settings.age} years old` : ''].filter(Boolean).join(' | ')}
                </span>
              </div>
            ) : null}
            <div className="flex items-center gap-2 text-body" style={{ color: '#B9B9B9' }}>
              <Pin width={18} height={18} strokeWidth={1.5} />
              <span>{[settings.city, settings.country].filter(Boolean).join(', ') || 'Unknown'}</span>
            </div>
          </div>
        </div>

        {/* Input/Select Fields */}
        <div className="flex flex-col gap-4">
          <SettingsField
            label="Country"
            value={settings.country}
            icon={<Pin width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="input"
            placeholder="e.g. United States"
            onChange={(value) => onChange?.('country', value)}
          />
          <SettingsField
            label="Language"
            value={settings.language}
            icon={<Globe width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="select"
            options={languageOptions}
            placeholder="Select language"
            onChange={(value) => onChange?.('language', value)}
          />
          <SettingsField
            label="Currency"
            value={settings.currency}
            icon={<Cash width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="select"
            options={currencyOptions}
            placeholder="Select currency"
            onChange={(value) => onChange?.('currency', value)}
          />
          <SettingsField
            label="Date of Birth"
            value={settings.dateOfBirth}
            icon={<Calendar width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="date"
            placeholder="Select date"
            onChange={(value) => onChange?.('dateOfBirth', value)}
          />
          <SettingsField
            label="Profession"
            value={settings.profession}
            icon={<Suitcase width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="input"
            placeholder="e.g. Developer"
            onChange={(value) => onChange?.('profession', value)}
          />
          <SettingsField
            label="Default Page"
            value={settings.defaultPage}
            icon={<HomeSimpleDoor width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="select"
            options={defaultPageOptions}
            placeholder="Select default page"
            onChange={(value) => onChange?.('defaultPage', value)}
          />
        </div>

        {/* Tax: label + switch on one row; when enabled, number input only */}
        {onTaxUpdate && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-body" style={{ color: '#E7E4E4' }}>
                Enable tax estimation
              </label>
              <button
                type="button"
                onClick={handleTaxToggle}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                  taxEnabled ? 'bg-[var(--accent-purple)]' : 'bg-[rgba(231,228,228,0.3)]'
                }`}
                aria-label="Toggle tax estimation"
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ease-in-out ${
                    taxEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {taxEnabled && (
              <div className="flex flex-col gap-2">
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-lg w-full"
                  style={{ backgroundColor: '#202020' }}
                >
                  <input
                    id="income-tax-rate"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={taxRateInput}
                    onChange={(e) => setTaxRateInput(e.target.value)}
                    onBlur={handleTaxBlur}
                    className="flex-1 text-body bg-transparent border-none outline-none min-w-0"
                    style={{ color: '#E7E4E4' }}
                    aria-label="Income tax rate percentage"
                  />
                </div>
                <p className="text-helper" style={{ color: 'rgba(231, 228, 228, 0.7)' }}>
                  Enter your estimated income tax rate (0–100%). Used to show estimated tax on the Income page.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Current Plan Section */}
        {settings.plan === 'basic' && (
          <div className="flex flex-col gap-3 mt-4">
            <div className="text-body" style={{ color: '#E7E4E4' }}>
              Current Plan
            </div>
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ backgroundColor: '#282828', color: '#E7E4E4' }}
              >
                <Crown width={18} height={18} strokeWidth={1.5} />
                <span className="text-body">Basic Tier</span>
              </button>
              <Link
                href="/pricing"
                className="px-6 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#E7E4E4', color: '#202020' }}
              >
                Upgrade to Premium
              </Link>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

