import { createElement, type ComponentType, type SVGProps } from 'react';
import { getIcon } from '@/lib/iconMapping';

interface CategoryIconProps extends SVGProps<SVGSVGElement> {
  /** Iconoir name stored on the category, e.g. "ShoppingBag". Unknown names fall back to HelpCircle. */
  name: string;
}

/** Renders a category's Iconoir icon by name without creating a component during render. */
export default function CategoryIcon({ name, ...props }: CategoryIconProps) {
  // iconMapping types its components narrowly; Iconoir icons accept every SVG prop.
  const icon = getIcon(name) as ComponentType<SVGProps<SVGSVGElement>>;
  return createElement(icon, props);
}

/** Icon name for a category in pickers: "Other" uses a grid, missing names or icons use HelpCircle. */
export function categoryIconName(categoryName?: string | null, iconKey?: string): string {
  if (!categoryName) return 'HelpCircle';
  if (categoryName.toLowerCase() === 'other') return 'ViewGrid';
  return iconKey || 'HelpCircle';
}
