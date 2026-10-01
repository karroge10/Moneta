'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Spinner from '@/components/ui/Spinner';
import { cx } from '@/components/ui/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary: purple gradient (.btn-primary); secondary: surface + border; ghost: text only; danger: red gradient. */
  variant?: ButtonVariant;
  /** sm 32px (dense toolbars only), md 40px (default), lg 44px (primary mobile actions). */
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy and blocks clicks while keeping the label width. */
  loading?: boolean;
  /** Renders a Next.js Link styled as a button. `disabled` and `loading` are ignored for links. */
  href?: string;
  /** Icon before the label. */
  icon?: ReactNode;
  fullWidth?: boolean;
}

/** The one button for the app. Pill shaped, scales to 0.96 on press, visible focus ring. */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  href,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = cx(
    'btn relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold',
    'active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    fullWidth && 'w-full',
    className,
  );

  const content = (
    <>
      <span className={cx('inline-flex items-center gap-2', loading && 'invisible')}>
        {icon}
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={16} color="currentColor" />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  danger: 'btn-danger',
  secondary: 'border border-line bg-surface-1 text-fg hover:border-line-strong hover:bg-surface-2',
  ghost: 'text-secondary hover:bg-surface-2 hover:text-fg',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-ui',
  md: 'h-10 px-5 text-ui',
  lg: 'h-11 px-6 text-copy',
};
