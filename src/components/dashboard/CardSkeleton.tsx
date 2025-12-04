'use client';

import Card from '@/components/ui/Card';

interface CardSkeletonProps {
  title: string;
  variant?: 'value' | 'list' | 'chart' | 'goal' | 'health' | 'update';
}

export default function CardSkeleton({ title, variant = 'value' }: CardSkeletonProps) {
  return (
    <Card title={title} showActions={false}>
      <div className="flex flex-col flex-1 mt-2">
        {variant === 'value' && (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              <div className="h-8 w-8 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
              <div className="h-12 w-32 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
            </div>
            <div className="h-4 w-24 rounded animate-pulse mt-4" style={{ backgroundColor: '#3a3a3a' }}></div>
          </>
        )}
        
        {variant === 'list' && (
          <div className="space-y-4 flex-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-32 rounded animate-pulse mb-2" style={{ backgroundColor: '#3a3a3a' }}></div>
                  <div className="h-3 w-20 rounded animate-pulse" style={{ backgroundColor: '#3a3a3a' }}></div>
                </div>
                <div className="h-4 w-16 rounded animate-pulse flex-shrink-0" style={{ backgroundColor: '#3a3a3a' }}></div>
              </div>
            ))}
          </div>
        )}
        
        {variant === 'chart' && (
          <>
            <div className="w-full h-[200px] rounded animate-pulse mb-4" style={{ backgroundColor: '#3a3a3a' }}></div>
            <div className="space-y-3 flex-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 min-w-0">
                  <div className="h-6 w-6 rounded animate-pulse flex-shrink-0" style={{ backgroundColor: '#3a3a3a' }}></div>
                  <div className="h-4 w-24 rounded animate-pulse flex-1" style={{ backgroundColor: '#3a3a3a' }}></div>
                  <div className="h-4 w-16 rounded animate-pulse flex-shrink-0" style={{ backgroundColor: '#3a3a3a' }}></div>
                </div>
              ))}
            </div>
          </>
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

