'use client';

import TypeaheadSelect from '@/components/ui/TypeaheadSelect';
import { buildCurrencyTypeaheadOptions, type CurrencyOption } from '@/lib/currency-country-map';
import type { TypeaheadOption } from '@/components/ui/TypeaheadSelect';

export type { CurrencyOption };

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
    ...buildCurrencyTypeaheadOptions(options, 'id'),
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
    <div className="w-full min-w-0">
      <TypeaheadSelect
        options={typeaheadOptions}
        value={value}
        onChange={handleChange}
        placeholder="Select currency"
        searchPlaceholder="Search (e.g. United States, USD)..."
        disabled={disabled}
        aria-label="Statement currency"
        dropdownInPortal
      />
    </div>
  );
}
