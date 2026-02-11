'use client';

import Card from '@/components/ui/Card';

interface CardSkeletonProps {
  title: string;
  variant?: 'value' | 'list' | 'chart' | 'goal' | 'health' | 'update' | 'table' | 'donut';
  className?: string;
}

export default function CardSkeleton({ title, variant = 'value', className }: CardSkeletonProps) {
  return (
    <Card title={title} showActions={false} className={className}>
      <div className="flex flex-col flex-1 mt-2 min-h-0">
        {variant === 'value' && (
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-full animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
              <div className="h-12 w-32 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
            </div>
            <div className="h-4 w-24 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
          </div>
        )}
        
        {variant === 'list' && (
          <div className="space-y-6 flex-1 overflow-hidden">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-2/3 rounded animate-pulse mb-2" style={{ backgroundColor: '#3a3a3a' }}></div>
                  <div className="h-3 w-1/3 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                </div>
                <div className="h-4 w-16 rounded animate-pulse flex-shrink-0" style={{ backgroundColor: '#3a3a3a' }}></div>
              </div>
            ))}
          </div>
        )}
        
        {variant === 'chart' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 flex items-end gap-2 min-h-[200px] mb-6 border-b border-[#3a3a3a] pb-2">
              {[40, 70, 45, 90, 65, 80, 50, 95, 60, 85, 40, 70, 45, 90, 65].map((height, i) => (
                <div 
                  key={i} 
                  className="flex-1 rounded-t animate-pulse" 
                  style={{ backgroundColor: '#3a3a3a', height: `${height}%` }}
                ></div>
              ))}
            </div>
            <div className="flex justify-between flex-shrink-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-3 w-8 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
              ))}
            </div>
          </div>
        )}

        {variant === 'table' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex border-b border-[#3a3a3a] pb-3 mb-4">
              <div className="w-[35%] h-3 rounded animate-pulse mr-4" style={{ backgroundColor: '#3a3a3a' }}></div>
              <div className="flex-1 h-3 rounded animate-pulse mr-4" style={{ backgroundColor: '#3a3a3a' }}></div>
              <div className="flex-1 h-3 rounded animate-pulse mr-4" style={{ backgroundColor: '#3a3a3a' }}></div>
              <div className="w-20 h-3 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
            </div>
            <div className="space-y-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-[35%] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                    <div className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                  </div>
                  <div className="flex-1 h-4 rounded animate-pulse mr-4" style={{ backgroundColor: '#3a3a3a' }}></div>
                  <div className="flex-1 h-4 rounded animate-pulse mr-4" style={{ backgroundColor: '#3a3a3a' }}></div>
                  <div className="w-20 h-4 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {variant === 'donut' && (
          <div className="flex flex-col items-center flex-1 min-h-0">
            <div className="relative w-44 h-44 mb-6 flex-shrink-0">
              <div className="absolute inset-0 rounded-full border-[16px] border-[#3a3a3a] animate-pulse"></div>
            </div>
            <div className="w-full space-y-4 flex-1 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: '#3a3a3a' }}></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-24 rounded animate-pulse mb-1" style={{ backgroundColor: '#3a3a3a' }}></div>
                    <div className="h-3 w-12 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                  </div>
                  <div className="h-4 w-16 rounded animate-pulse flex-shrink-0" style={{ backgroundColor: '#3a3a3a' }}></div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {variant === 'goal' && (
          <>
            <div className="h-3 w-24 rounded animate-pulse mb-2" style={{ backgroundColor: '#3a3a3a' }}></div>
            <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
              <div className="h-4 w-32 rounded animate-pulse flex-1" style={{ backgroundColor: '#3a3a3a' }}></div>
              <div className="h-4 w-20 rounded animate-pulse flex-shrink-0" style={{ backgroundColor: '#3a3a3a' }}></div>
            </div>
            <div className="flex items-center gap-2 mb-4 min-w-0 flex-wrap">
              <div className="h-8 w-8 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
              <div className="h-12 w-32 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
            </div>
            <div className="h-2 w-full rounded-full animate-pulse mb-4" style={{ backgroundColor: '#3a3a3a' }}></div>
            <div className="h-3 w-full rounded animate-pulse mb-6" style={{ backgroundColor: '#3a3a3a' }}></div>
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
              ))}
            </div>
          </>
        )}
        
        {variant === 'health' && (
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="h-24 w-24 rounded-full animate-pulse mb-4" style={{ backgroundColor: '#3a3a3a' }}></div>
            <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
          </div>
        )}
        
        {variant === 'update' && (
          <>
            <div className="h-3 w-20 rounded animate-pulse mb-4" style={{ backgroundColor: '#3a3a3a' }}></div>
            <div className="h-4 w-full rounded animate-pulse mb-2" style={{ backgroundColor: '#3a3a3a' }}></div>
            <div className="h-4 w-3/4 rounded animate-pulse mb-4" style={{ backgroundColor: '#3a3a3a' }}></div>
            <div className="h-4 w-24 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
          </>
        )}
      </div>
    </Card>
  );
}


