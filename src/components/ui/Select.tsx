import type { SelectHTMLAttributes } from 'react';
import { NavArrowDown } from 'iconoir-react';
import { inputClass } from '@/components/ui/Field';
import { cx } from '@/components/ui/cx';

/** Native select styled like the other inputs, with the app chevron instead of the browser arrow. */
export default function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cx(inputClass, 'cursor-pointer appearance-none pr-10', className)}>
        {children}
      </select>
      <NavArrowDown
        width={16}
        height={16}
        strokeWidth={2}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-secondary"
        aria-hidden="true"
      />
    </div>
  );
}
