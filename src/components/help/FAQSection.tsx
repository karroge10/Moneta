'use client';

import { useEffect, useMemo, useState } from 'react';
import { HelpCircle } from 'iconoir-react';
import SearchBar from '@/components/transactions/shared/SearchBar';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import type { FAQItem } from '@/lib/faqData';

interface FAQSectionProps {
  faqItems: FAQItem[];
}

const CATEGORIES = ['All', 'General', 'Account', 'Features', 'Technical'] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

/** Searchable FAQ list. Links like /help#faq-14 scroll to the matching answer. */
export default function FAQSection({ faqItems }: FAQSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');

  useEffect(() => {
    scrollToFaqHash();
    window.addEventListener('hashchange', scrollToFaqHash);
    return () => window.removeEventListener('hashchange', scrollToFaqHash);
  }, []);

  const filteredFAQs = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return faqItems.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        query === '' || item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [faqItems, searchQuery, selectedCategory]);

  return (
    <Card title="FAQ" showActions={false}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="flex-[0.6]">
            <SearchBar placeholder="Search questions" value={searchQuery} onChange={setSearchQuery} />
          </div>
          <div className="flex-[0.4]">
            <label htmlFor="faq-category" className="sr-only">
              Category
            </label>
            <Select
              id="faq-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as CategoryFilter)}
              className="rounded-full"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category === 'All' ? 'All categories' : category}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-6" aria-live="polite">
          {filteredFAQs.map((item) => (
            <div key={item.id} id={`faq-${item.id}`} className="flex scroll-mt-28 gap-4">
              <HelpCircle width={24} height={24} strokeWidth={1.5} className="mt-1 shrink-0 text-fg" aria-hidden="true" />
              <div className="flex flex-1 flex-col gap-2">
                <h3 className="text-copy font-semibold text-balance">{item.question}</h3>
                <p className="text-copy text-secondary text-pretty">{item.answer}</p>
              </div>
            </div>
          ))}
          {filteredFAQs.length === 0 && <p className="text-copy text-secondary">No questions match your search.</p>}
        </div>
      </div>
    </Card>
  );
}

function scrollToFaqHash() {
  const hash = window.location.hash;
  if (!hash.startsWith('#faq-')) return;
  const id = hash.slice(1);
  window.requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
