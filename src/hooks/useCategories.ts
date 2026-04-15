'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { type Category } from '@/types/dashboard';

async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories');
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  const data = await response.json();
  return data.categories || [];
}

export function useCategories() {
  const { isLoaded, isSignedIn } = useAuth();
  const authReady = !!(isLoaded && isSignedIn);

  const query = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: authReady,
    staleTime: 24 * 60 * 60 * 1000, // 24h caching
  });

  return { 
    categories: query.data ?? [], 
    loading: query.isPending, 
    error: query.error as Error | null, 
    refetch: query.refetch 
  };
}
