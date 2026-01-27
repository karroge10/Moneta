'use client';

import { useCallback, useEffect, useState } from 'react';
import { type Category } from '@/types/dashboard';
import { idbGet, idbSet } from '@/lib/idb';

let cachedCategories: Category[] | null = null;
let categoriesPromise: Promise<Category[]> | null = null;
const CACHE_KEY = 'categories-cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function loadCategories(force = false): Promise<Category[]> {
  if (!force && cachedCategories) return cachedCategories;
  if (!force && categoriesPromise) return categoriesPromise;

  categoriesPromise = (async () => {
    const response = await fetch('/api/categories');
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const data = await response.json();
    cachedCategories = data.categories || [];
    // Fire and forget cache persistence
    idbSet(CACHE_KEY, { data: cachedCategories, timestamp: Date.now() });
    return cachedCategories;
  })();

  try {
    return await categoriesPromise;
  } finally {
    categoriesPromise = null;
  }
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(cachedCategories ?? []);
  const [loading, setLoading] = useState(!cachedCategories);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cachedCategories) return;
    let cancelled = false;

    const hydrate = async () => {
      setLoading(true);
      try {
        const cached = await idbGet<{ data: Category[]; timestamp: number }>(CACHE_KEY);
        const isStale = !cached || Date.now() - cached.timestamp > CACHE_TTL_MS;

        if (cached?.data && !cancelled) {
          setCategories(cached.data);
          setError(null);
          if (!isStale) {
            setLoading(false);
            return;
          }
        }

        const fresh = await loadCategories(isStale);
        if (!cancelled) {
          setCategories(fresh);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        const normalized = err instanceof Error ? err : new Error('Failed to fetch categories');
        setError(normalized);
        console.error('Error fetching categories:', normalized);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    cachedCategories = null;
    categoriesPromise = null;
    try {
      const cats = await loadCategories(true);
      setCategories(cats);
      return cats;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error('Failed to fetch categories');
      setError(normalized);
      throw normalized;
    } finally {
      setLoading(false);
    }
  }, []);

  return { categories, loading, error, refetch };
}

