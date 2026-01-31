'use client';

import TypeaheadSelect from '@/components/ui/TypeaheadSelect';
import {
  getCountryCodeForCurrency,
  getSearchTermsForCurrency,
} from '@/lib/currency-country-map';
import type { TypeaheadOption } from '@/components/ui/TypeaheadSelect';

export type CurrencyOption = {
  id: number;
  name: string;
  symbol: string;
  alias: string;
};

interface CurrencySelectorProps {
  options: CurrencyOption[];
  selectedCurrencyId: number | null;
  onSelect: (currencyId: number | null) => void;
  disabled?: boolean;
}

export default function CurrencySelector({
  options,
  selectedCurrencyId,
  onSelect,
  disabled = false,
}: CurrencySelectorProps) {
  const typeaheadOptions: TypeaheadOption[] = [
    {
      value: '__none__',
      label: 'Select currency',
    },
    ...options.map((c) => ({
      value: c.id.toString(),
      label: c.name,
      countryCode: getCountryCodeForCurrency(c.alias),
      searchTerms: [c.name, c.alias, ...getSearchTermsForCurrency(c.alias)],
      suffix: c.symbol,
    })),
  ];

  const value =
    selectedCurrencyId !== null
      ? selectedCurrencyId.toString()
      : '__none__';

  const handleChange = (v: string) => {
    if (v === '__none__' || v === '') {
      onSelect(null);
    } else {
      const id = Number.parseInt(v, 10);
      if (!Number.isNaN(id)) onSelect(id);
    }
  };

  return (
    <div className="w-full sm:w-auto sm:min-w-[320px]">
      <TypeaheadSelect
        options={typeaheadOptions}
        value={value}
        onChange={handleChange}
        placeholder="Select currency"
        searchPlaceholder="Search (e.g. United States, USD)..."
        disabled={disabled}
        aria-label="Statement currency"
      />
    </div>
  );
}
