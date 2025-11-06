'use client';

import Link from 'next/link';
import Card from '@/components/ui/Card';
import SettingsField from './SettingsField';
import { UserSettings } from '@/types/dashboard';
import { 
  Edit, 
  User, 
  Suitcase, 
  Pin, 
  Globe, 
  Cash, 
  Calendar, 
  HomeSimpleDoor,
  Crown 
} from 'iconoir-react';

interface PersonalInformationCardProps {
  settings: UserSettings;
  onEdit?: (field: string) => void;
  onChange?: (field: string, value: string) => void;
}

export default function PersonalInformationCard({ 
  settings, 
  onEdit,
  onChange 
}: PersonalInformationCardProps) {
  const countryOptions = ['United States of America', 'Georgia', 'United Kingdom', 'Canada', 'Germany'];
  const languageOptions = ['English', 'Spanish', 'French', 'German', 'Russian'];
  const currencyOptions = ['$ USD', '€ EUR', '£ GBP', '₾ GEL', '¥ JPY'];
  const dateOptions = ['March 20th 2001', 'January 1st 2000', 'December 25th 1999'];
  const defaultPageOptions = ['Dashboard', 'Statistics', 'Transactions', 'Goals', 'Investments'];

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
              <User 
                width={40} 
                height={40} 
                strokeWidth={1.5} 
                style={{ color: '#AC66DA' }}
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-body font-semibold" style={{ color: '#E7E4E4' }}>
                {settings.name}
              </span>
              <button
                onClick={() => onEdit?.('name')}
                className="hover:opacity-70 transition-opacity"
              >
                <Edit width={16} height={16} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-body" style={{ color: '#B9B9B9' }}>
              <User width={18} height={18} strokeWidth={1.5} />
              <span>{settings.username}</span>
            </div>
            <div className="flex items-center gap-2 text-body" style={{ color: '#B9B9B9' }}>
              <Suitcase width={18} height={18} strokeWidth={1.5} />
              <span>{settings.jobPosition} | {settings.age} years old</span>
            </div>
            <div className="flex items-center gap-2 text-body" style={{ color: '#B9B9B9' }}>
              <Pin width={18} height={18} strokeWidth={1.5} />
              <span>{settings.city}, {settings.country}</span>
            </div>
          </div>
        </div>

        {/* Input/Select Fields */}
        <div className="flex flex-col gap-4">
          <SettingsField
            label="Country"
            value={settings.country}
            icon={<Pin width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="select"
            options={countryOptions}
            onChange={(value) => onChange?.('country', value)}
          />
          <SettingsField
            label="Language"
            value={settings.language}
            icon={<Globe width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="select"
            options={languageOptions}
            onChange={(value) => onChange?.('language', value)}
          />
          <SettingsField
            label="Currency"
            value={settings.currency}
            icon={<Cash width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="select"
            options={currencyOptions}
            onChange={(value) => onChange?.('currency', value)}
          />
          <SettingsField
            label="Date of Birth"
            value={settings.dateOfBirth}
            icon={<Calendar width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="select"
            options={dateOptions}
            onChange={(value) => onChange?.('dateOfBirth', value)}
          />
          <SettingsField
            label="Profession"
            value={settings.profession}
            icon={<Suitcase width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="input"
            onEdit={() => onEdit?.('profession')}
          />
          <SettingsField
            label="Default Page"
            value={settings.defaultPage}
            icon={<HomeSimpleDoor width={20} height={20} strokeWidth={1.5} style={{ color: '#B9B9B9' }} />}
            type="select"
            options={defaultPageOptions}
            onChange={(value) => onChange?.('defaultPage', value)}
          />
        </div>

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

