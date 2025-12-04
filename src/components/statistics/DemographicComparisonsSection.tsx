'use client';

import { useState, useRef, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { NavArrowDown, Filter, User } from 'iconoir-react';
import { DemographicComparison } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import ComingSoonBadge from '@/components/ui/ComingSoonBadge';

interface DemographicComparisonsSectionProps {
  comparisons: DemographicComparison[];
}

export default function DemographicComparisonsSection({ comparisons }: DemographicComparisonsSectionProps) {
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('25-34');
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const ageGroupOptions = ['18-24', '25-34', '35-44', '45-54', '55+'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const textColor = isHovered ? '#AC66DA' : '#E7E4E4';

  return (
    <Card 
      title="Demographic Comparisons"
      customHeader={
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-card-header">Demographic Comparisons</h2>
          <ComingSoonBadge />
        </div>
      }
      showActions={false}
    >
      <div className="flex flex-col gap-4" style={{ filter: 'blur(2px)' }}>
        <div className="mb-2">
          <div className="relative" ref={ref}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-colors cursor-pointer w-full justify-between"
              style={{ backgroundColor: '#202020', color: textColor }}
            >
              <div className="flex items-center gap-2">
                <Filter width={18} height={18} strokeWidth={1.5} style={{ color: textColor }} />
                <User width={18} height={18} strokeWidth={1.5} style={{ color: textColor }} />
                <span className="text-sm font-semibold">{selectedAgeGroup}</span>
              </div>
              <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: textColor }} />
            </button>
            
            {isOpen && (
              <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl shadow-lg overflow-hidden z-10" style={{ backgroundColor: '#202020' }}>
                {ageGroupOptions.map((option) => {
                  const isSelected = selectedAgeGroup === option;
                  return (
                    <button
                      key={option}
                      onClick={() => {
                        setSelectedAgeGroup(option);
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer"
                      style={{ 
                        backgroundColor: 'transparent',
                        color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' 
                      }}
                    >
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          {comparisons.map((comparison) => {
            const Icon = getIcon(comparison.icon);
            return (
              <div
                key={comparison.id}
                className="flex items-center gap-3 p-3"
                style={{
                  backgroundColor: '#202020',
                  borderRadius: '30px',
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(163, 102, 203, 0.1)' }}
                >
                  <Icon
                    width={24}
                    height={24}
                    strokeWidth={1.5}
                    style={{ color: '#E7E4E4' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-body font-medium text-wrap-safe break-words">{comparison.label}</div>
                  <div 
                    className="text-helper text-wrap-safe break-words"
                    style={{
                      color: comparison.comparison.toLowerCase().includes('higher') || 
                             comparison.comparison.toLowerCase().includes('points higher')
                        ? '#74C648'
                        : comparison.comparison.toLowerCase().includes('lower')
                        ? '#D93F3F'
                        : 'rgba(231, 228, 228, 0.7)'
                    }}
                  >
                    {comparison.comparison}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

