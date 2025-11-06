'use client';

import { Category } from '@/types/dashboard';
import { getIcon } from '@/lib/iconMapping';

interface CategoryButtonProps {
  category: Category;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CategoryButton({ category, onClick, size = 'md', className = '' }: CategoryButtonProps) {
  const Icon = getIcon(category.icon);
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: { width: 20, height: 20 },
    md: { width: 24, height: 24 },
    lg: { width: 28, height: 28 },
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl transition-all cursor-pointer hover:scale-105 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: category.color + '20' }}
    >
      <Icon 
        width={iconSizes[size].width} 
        height={iconSizes[size].height} 
        strokeWidth={1.5}
        style={{ color: category.color }}
      />
      <span 
        className="text-xs font-medium text-center"
        style={{ color: category.color }}
      >
        {category.name}
      </span>
    </button>
  );
}


