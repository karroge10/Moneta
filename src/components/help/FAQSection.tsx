'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { HelpCircle, Filter, NavArrowDown, User, Spark, Settings, Crown } from 'iconoir-react';
import SearchBar from '@/components/transactions/shared/SearchBar';
import Card from '@/components/ui/Card';
import { FAQItem } from '@/lib/faqData';

interface FAQSectionProps {
  faqItems: FAQItem[];
}

interface CategoryOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ width?: number; height?: number; strokeWidth?: number; style?: React.CSSProperties }>;
}

export default function FAQSection({ faqItems }: FAQSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFilterHovered, setIsFilterHovered] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const categories: CategoryOption[] = [
    { value: 'All', label: 'All', icon: Filter },
    { value: 'General', label: 'General', icon: HelpCircle },
    { value: 'Account', label: 'Account', icon: User },
    { value: 'Features', label: 'Features', icon: Spark },
    { value: 'Technical', label: 'Technical', icon: Settings },
    { value: 'Pricing', label: 'Pricing', icon: Crown },
  ];

  const selectedCategoryObj = categories.find(cat => cat.value === selectedCategory) || categories[0];
  const SelectedIcon = selectedCategoryObj.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredFAQs = useMemo(() => {
    return faqItems.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [faqItems, searchQuery, selectedCategory]);

  const filterTextColor = isFilterHovered ? '#AC66DA' : '#E7E4E4';

  return (
    <Card 
      title="FAQ"
      showActions={false}
      customHeader={
        <div className="mb-4">
          <h2 className="text-card-header">FAQ</h2>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Search and Filter */}
        <div className="flex items-center gap-3">
          <div className="flex-[0.6]">
            <SearchBar
              placeholder="Search..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <div className="flex-[0.4] relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              onMouseEnter={() => setIsFilterHovered(true)}
              onMouseLeave={() => setIsFilterHovered(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer w-full justify-between"
              style={{ backgroundColor: '#202020' }}
            >
              <div className="flex items-center gap-2" style={{ color: filterTextColor, transition: 'color 0.15s ease' }}>
                <SelectedIcon width={18} height={18} strokeWidth={1.5} style={{ color: filterTextColor, transition: 'color 0.15s ease' }} />
                <span className="text-sm font-semibold" style={{ color: filterTextColor, transition: 'color 0.15s ease' }}>{selectedCategoryObj.label}</span>
              </div>
              <NavArrowDown width={16} height={16} strokeWidth={2} style={{ color: filterTextColor, transition: 'color 0.15s ease' }} />
            </button>
            
            {isFilterOpen && (
              <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl shadow-lg overflow-hidden z-10" style={{ backgroundColor: '#202020' }}>
                {categories.map((category) => {
                  const isSelected = selectedCategory === category.value;
                  const CategoryIcon = category.icon;
                  return (
                    <button
                      key={category.value}
                      onClick={() => {
                        setSelectedCategory(category.value);
                        setIsFilterOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover-text-purple transition-colors text-body cursor-pointer"
                      style={{ 
                        backgroundColor: 'transparent',
                        color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' 
                      }}
                    >
                      <CategoryIcon 
                        width={20} 
                        height={20} 
                        strokeWidth={1.5} 
                        style={{ color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' }} 
                      />
                      <span>{category.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* FAQ List */}
        <div className="flex flex-col gap-6">
          {filteredFAQs.map((item) => (
            <div key={item.id} className="flex gap-4">
              <div className="shrink-0 mt-1">
                <HelpCircle 
                  width={24} 
                  height={24} 
                  strokeWidth={1.5}
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <h3 className="text-body font-semibold">{item.question}</h3>
                <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
          {filteredFAQs.length === 0 && (
            <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
              No FAQs found matching your criteria.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

