'use client';

import { Category } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';
import SearchBar from './shared/SearchBar';
import CategoryFilter from './shared/CategoryFilter';
import Card from '@/components/ui/Card';

interface CategoryGridProps {
  categories: Category[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string | null;
  onCategoryFilterChange: (category: string | null) => void;
  availableCategories: Category[];
}

export default function CategoryGrid({ 
  categories, 
  searchQuery, 
  onSearchChange,
  selectedCategory,
  onCategoryFilterChange,
  availableCategories 
}: CategoryGridProps) {
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card title="Categories" className="h-full flex flex-col">
      <div className="flex flex-col gap-4 mt-4 flex-1 min-h-0">
        <div className="flex gap-3 shrink-0">
          <div className="flex-[0.6]">
            <SearchBar value={searchQuery} onChange={onSearchChange} />
          </div>
          <div className="flex-[0.4]">
            <CategoryFilter 
              categories={availableCategories}
              selectedCategory={selectedCategory}
              onSelect={onCategoryFilterChange}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 min-h-0" style={{ maxHeight: '600px' }}>
          <div className="grid grid-cols-2 gap-2">
            {filteredCategories.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-8 text-center">
                <div className="text-body mb-2 opacity-70">No categories found</div>
                <div className="text-helper">Try adjusting your search</div>
              </div>
            ) : (
              filteredCategories.map((category) => {
              const Icon = getIcon(category.icon);
              return (
                <button
                  key={category.id}
                  className="w-full flex items-center gap-3 p-3 transition-all cursor-pointer hover:opacity-80"
                  style={{ 
                    backgroundColor: '#202020',
                    borderRadius: '30px'
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
                  <span className="text-body font-medium flex-1 text-left">{category.name}</span>
                </button>
              );
            })
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

