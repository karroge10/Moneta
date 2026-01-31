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
  Reports,
  LotOfCash,
  CalendarCheck,
  BitcoinCircle,
} from 'iconoir-react';
import type { SelectOptionItem } from './SettingsField';
import { COUNTRIES } from '@/lib/countries';
import {
  getCountryCodeForCurrency,
  getSearchTermsForCurrency,
  getDisplayNameForCurrency,
} from '@/lib/currency-country-map';
import { getCountryCodeForLanguage } from '@/lib/language-country-map';

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
  languageOptions?: { id: number; name: string; alias: string }[];
  currencyOptions?: { id: number; name: string; symbol: string; alias: string }[];
  userImageUrl?: string | null;
  onOpenAccountProfile?: () => void;
  loading?: boolean;
  /** When true, fields are disabled (e.g. while saving). */
  disabled?: boolean;
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
  onOpenAccountProfile,
  loading = false,
  disabled = false,
}: PersonalInformationCardProps) {
  const ICON_STYLE = { width: 18, height: 18, strokeWidth: 1.5, style: { color: '#B9B9B9' } };
  const countryOptionItems: SelectOptionItem[] = COUNTRIES.map((c) => ({
    value: c.name,
    label: c.name,
    countryCode: c.code,
    searchTerms: [c.name, c.code],
  }));
  const languageOptionItems: SelectOptionItem[] = languageOptionsProp?.length
    ? languageOptionsProp
        .filter((l) => l.name !== 'Georgian')
        .map((l) => {
          const countryCode = getCountryCodeForLanguage(l.alias ?? l.name);
          return {
            value: l.name,
            label: l.name,
            countryCode,
            searchTerms: [l.name, l.alias ?? ''],
            ...(countryCode ? {} : { icon: <Globe {...ICON_STYLE} /> }),
          };
        })
    : settings.language
      ? [{ value: settings.language, label: settings.language, icon: <Globe {...ICON_STYLE} /> }]
      : [];
  const currencyOptionItems: SelectOptionItem[] = currencyOptionsProp?.length
    ? currencyOptionsProp.map((c) => ({
        value: `${c.symbol} ${c.alias}`,
        label: getDisplayNameForCurrency(c.alias) ?? c.name,
        countryCode: getCountryCodeForCurrency(c.alias),
        searchTerms: [c.name, c.alias, ...getSearchTermsForCurrency(c.alias)],
        suffix: c.symbol,
      }))
    : settings.currency
      ? [{ value: settings.currency, label: settings.currency, symbol: settings.currency.split(' ')[0] ?? '', alias: settings.currency.split(' ')[1] ?? settings.currency }]
      : [];
  const defaultPageOptionItems: SelectOptionItem[] = [
    { value: 'Dashboard', label: 'Dashboard', icon: <HomeSimpleDoor {...ICON_STYLE} /> },
    { value: 'Statistics', label: 'Statistics', icon: <Reports {...ICON_STYLE} /> },
    { value: 'Transactions', label: 'Transactions', icon: <LotOfCash {...ICON_STYLE} /> },
    { value: 'Goals', label: 'Goals', icon: <CalendarCheck {...ICON_STYLE} /> },
    { value: 'Investments', label: 'Investments', icon: <BitcoinCircle {...ICON_STYLE} /> },
  ];

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
            {onOpenAccountProfile ? (
              <button
                type="button"
                onClick={onOpenAccountProfile}
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center cursor-pointer transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent-purple)] focus:ring-offset-2 focus:ring-offset-[#282828]"
                style={{ backgroundColor: 'rgba(163, 102, 203, 0.2)' }}
                aria-label="Change profile photo"
              >
                {userImageUrl ? (
                  <img
                    src={userImageUrl}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none"
                  />
                ) : (
                  <User
                    width={40}
                    height={40}
                    strokeWidth={1.5}
                    style={{ color: '#AC66DA' }}
                  />
                )}
              </button>
            ) : (
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
            )}
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
            {settings.country ? (
              <div className="flex items-center gap-2 text-body" style={{ color: '#B9B9B9' }}>
                <Pin width={18} height={18} strokeWidth={1.5} />
                <span>{settings.country}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Input/Select Fields */}
        <div className="flex flex-col gap-4">
          <SettingsField
            label="First name"
            value={settings.firstName}
            icon={<User width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="input"
            placeholder="First name"
            disabled={disabled}
            onChange={(value) => onChange?.('firstName', value)}
          />
          <SettingsField
            label="Last name"
            value={settings.lastName}
            icon={<User width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="input"
            placeholder="Last name"
            disabled={disabled}
            onChange={(value) => onChange?.('lastName', value)}
          />
          <SettingsField
            label="Country"
            value={settings.country}
            icon={<Pin width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="typeahead"
            optionItems={countryOptionItems}
            placeholder="Select country"
            searchPlaceholder="Search countries..."
            disabled={disabled}
            onChange={(value) => onChange?.('country', value)}
          />
          <SettingsField
            label="Language"
            value={settings.language}
            icon={<Globe width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="typeahead"
            optionItems={languageOptionItems}
            placeholder="Select language"
            searchPlaceholder="Search languages..."
            disabled={disabled}
            onChange={(value) => onChange?.('language', value)}
          />
          <SettingsField
            label="Currency"
            value={settings.currency}
            icon={<Cash width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="typeahead"
            optionItems={currencyOptionItems}
            placeholder="Select currency"
            searchPlaceholder="Search currencies (e.g. United States, USD)..."
            disabled={disabled}
            onChange={(value) => onChange?.('currency', value)}
          />
          <SettingsField
            label="Date of Birth"
            value={settings.dateOfBirth}
            icon={<Calendar width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="date"
            placeholder="Select date"
            disabled={disabled}
            onChange={(value) => onChange?.('dateOfBirth', value)}
          />
          <SettingsField
            label="Profession"
            value={settings.profession}
            icon={<Suitcase width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="input"
            placeholder="e.g. Developer"
            disabled={disabled}
            onChange={(value) => onChange?.('profession', value)}
          />
          <SettingsField
            label="Default Page"
            value={settings.defaultPage}
            icon={<HomeSimpleDoor width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="typeahead"
            optionItems={defaultPageOptionItems}
            placeholder="Select default page"
            searchPlaceholder="Search default page..."
            dropdownInPortal
            disabled={disabled}
            onChange={(value) => onChange?.('defaultPage', value)}
          />
        </div>

        {/* Tax: label + switch on one row; when enabled, number input only */}
        {onTaxUpdate && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <label className="text-body" style={{ color: '#E7E4E4' }}>
                Enable tax estimation
              </label>
              <button
                type="button"
                onClick={handleTaxToggle}
                disabled={disabled}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                  disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                } ${taxEnabled ? 'bg-[var(--accent-purple)]' : 'bg-[rgba(231,228,228,0.3)]'}`}
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
                  className="flex items-center gap-3 px-4 py-3 rounded-lg w-full border border-[#3a3a3a]"
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
                    disabled={disabled}
                    className="flex-1 text-body bg-transparent border-none outline-none min-w-0 disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="inline-flex items-center gap-2 pl-0 pr-4 py-2 rounded-full cursor-default"
                style={{ backgroundColor: '#282828', color: '#E7E4E4' }}
              >
                <Crown width={18} height={18} strokeWidth={1.5} />
                <span className="text-body">Basic Tier</span>
              </span>
              <Link
                href="/pricing"
                className="px-6 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90 cursor-pointer"
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

