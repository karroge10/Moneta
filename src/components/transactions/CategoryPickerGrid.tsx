'use client';

import { Category } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';

interface CategoryPickerGridProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (category: Category) => void;
}

export default function CategoryPickerGrid({ categories, selectedCategoryId, onSelectCategory }: CategoryPickerGridProps) {
  return (
    <div>
      <h3 className="text-body font-semibold mb-4">Select Category</h3>
      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        {categories.map((category) => {
          const Icon = getIcon(category.icon);
          const isSelected = selectedCategoryId === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category)}
              className={`w-full flex items-center gap-3 p-3 transition-all cursor-pointer ${
                isSelected ? 'ring-2 ring-[#AC66DA]' : ''
              } hover:opacity-80`}
              style={{ 
                backgroundColor: '#202020',
                borderRadius: '30px'
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
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
        })}
      </div>
    </div>
  );
}
