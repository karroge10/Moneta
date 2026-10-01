import { createElement, type ComponentType, type SVGProps } from 'react';
import { getIcon } from '@/lib/iconMapping';

interface NamedIconProps extends SVGProps<SVGSVGElement> {
  /** Iconoir name from the API, e.g. "ShoppingBag". Unknown names fall back to HelpCircle. */
  name: string;
}

/** Renders an Iconoir icon by name without creating a component during render. */
export default function NamedIcon({ name, ...props }: NamedIconProps) {
  // iconMapping types its components narrowly; Iconoir icons accept every SVG prop.
  const icon = getIcon(name) as ComponentType<SVGProps<SVGSVGElement>>;
  return createElement(icon, props);
}
