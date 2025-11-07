'use client';

import { NavArrowLeft, NavArrowRight, Reports, Clock, Download, LightBulb } from 'iconoir-react';
import { featureCards } from '@/lib/pricingData';

const iconMap: Record<string, React.ComponentType<{ width?: number; height?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>> = {
  Reports,
  Clock,
  Download,
  LightBulb,
};

export default function FeatureCarousel() {
  // Since we have exactly 4 cards, show all of them
  const visibleCards = featureCards;
  const canGoNext = false; // No need to navigate when all cards are visible
  const canGoPrev = false;

  const nextCard = () => {
    // Reserved for future use if more cards are added
  };

  const prevCard = () => {
    // Reserved for future use if more cards are added
  };

  return (
    <div className="card-surface flex flex-col gap-6">
      <div>
        <h2 className="text-card-header mb-2">Paid Features</h2>
        <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
          Track your income, expenses, and financial goals with powerful tools tailored to your needs.
        </p>
      </div>

      <div className="relative">
        {/* Navigation Arrows - Always visible for design consistency */}
        <button
          onClick={prevCard}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-[#393939] opacity-50"
          style={{ backgroundColor: '#282828' }}
          aria-label="Previous features"
          disabled={!canGoPrev}
        >
          <NavArrowLeft width={20} height={20} strokeWidth={1.5} style={{ color: 'var(--accent-purple)' }} />
        </button>

        <button
          onClick={nextCard}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:bg-[#393939] opacity-50"
          style={{ backgroundColor: '#282828' }}
          aria-label="Next features"
          disabled={!canGoNext}
        >
          <NavArrowRight width={20} height={20} strokeWidth={1.5} style={{ color: 'var(--accent-purple)' }} />
        </button>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleCards.map((card) => {
            const IconComponent = iconMap[card.icon];
            return (
              <div 
                key={card.id} 
                className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl transition-all hover:scale-105 cursor-pointer"
                style={{ backgroundColor: '#202020' }}
              >
                {IconComponent && (
                  <div className="w-16 h-16 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: 'rgba(172, 102, 218, 0.1)' }}>
                    <IconComponent width={32} height={32} strokeWidth={1.5} style={{ color: 'var(--accent-purple)' }} />
                  </div>
                )}
                <h3 className="text-card-header">{card.title}</h3>
                <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

