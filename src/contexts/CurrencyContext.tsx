'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Currency {
  id: number;
  name: string;
  symbol: string;
  alias: string;
}

interface CurrencyContextType {
  currency: Currency;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const DEFAULT_CURRENCY: Currency = {
  id: 0,
  name: 'US Dollar',
  symbol: '$',
  alias: 'USD',
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCurrency = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/user/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.currency) {
          setCurrency({
            id: data.currency.id,
            name: data.currency.name,
            symbol: data.currency.symbol,
            alias: data.currency.alias,
          });
        } else {
          setCurrency(DEFAULT_CURRENCY);
        }
      } else {
        throw new Error('Failed to fetch currency settings');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching currency:', error);
      // Fall back to default currency on error
      setCurrency(DEFAULT_CURRENCY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrency();
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, loading, error, refetch: fetchCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

